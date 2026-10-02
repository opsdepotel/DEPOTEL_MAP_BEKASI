import * as XLSX from 'xlsx';
import { TeamActivity, TeamUser, ActivityFilter } from '../types';
import { parseActivityTimestamp, formatWaktuDisplay } from './googleSheets';

// In-memory cache to prevent duplicate network calls for coordinates already resolved
const addressCache = new Map<string, string>();

/**
 * Reverse geocodes latitude & longitude into a human-readable street address.
 * Uses Photon (OpenStreetMap) with Nominatim fallback and site/fallback text.
 */
export async function reverseGeocodeCoordinate(
  lat: number,
  lng: number,
  fallbackText?: string
): Promise<string> {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return fallbackText || '-';
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  // 1. Try Photon (fast, lightweight OSM reverse geocoder)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DepotelFieldTrackingApp/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const props = data.features?.[0]?.properties;
      if (props) {
        const parts: string[] = [];
        if (props.name) parts.push(props.name);
        if (props.street && props.street !== props.name) parts.push(props.street);
        if (props.locality && !parts.includes(props.locality)) parts.push(props.locality);
        if (props.district) parts.push(props.district);
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        if (props.postcode) parts.push(props.postcode);

        if (parts.length > 0) {
          const formatted = parts.join(', ');
          addressCache.set(cacheKey, formatted);
          return formatted;
        }
      }
    }
  } catch {
    // Continue to Nominatim fallback
  }

  // 2. Try Nominatim (detailed OSM reverse geocoding)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DepotelFieldTrackingApp/1.0 (info@depotel.net)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        // Clean display_name by removing redundant country trailing if desired, or keep clean
        const displayName = data.display_name.trim();
        addressCache.set(cacheKey, displayName);
        return displayName;
      }
    }
  } catch {
    // Continue to fallback
  }

  // 3. Graceful fallback: existing location name, site name, or coordinate string
  const fallback =
    fallbackText && fallbackText !== '-' && !fallbackText.includes('google.com/maps')
      ? fallbackText
      : `Koordinat (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

  addressCache.set(cacheKey, fallback);
  return fallback;
}

export interface FirstActivityRow {
  No: number;
  Time: string;
  'User Name': string;
  Status: string;
  Koordinat: string;
  Alamat: string;
}

/**
 * Concurrency helper for smooth, rate-controlled parallel execution.
 */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Extracts the first activity (earliest CreatedAt/time) for each user matching the filter,
 * resolves street addresses from coordinates, and downloads a formatted Excel (.xlsx) file.
 */
export async function exportFirstActivitiesToExcel(options: {
  activities: TeamActivity[];
  users: TeamUser[];
  filter: ActivityFilter;
  onProgress?: (current: number, total: number) => void;
}): Promise<{ totalExported: number; fileName: string }> {
  const { activities, users, filter, onProgress } = options;

  if (!activities || activities.length === 0) {
    throw new Error('Tidak ada data aktivitas yang sesuai dengan filter saat ini.');
  }

  // 1. Group activities by user (using email, id, or name join)
  const userMap = new Map<string, { user: TeamUser | null; name: string; acts: TeamActivity[] }>();

  activities.forEach(act => {
    const actEmail = (act.userEmail || '').trim().toLowerCase();
    const actUserId = (act.userId || '').trim().toLowerCase();
    const actUserName = (act.userName || '').trim().toLowerCase();

    let matchedUser: TeamUser | undefined;
    if (actEmail) {
      matchedUser = users.find(u => u.email && u.email.trim().toLowerCase() === actEmail);
    }
    if (!matchedUser && actUserId) {
      matchedUser = users.find(
        u => u.id.trim().toLowerCase() === actUserId || (u.email && u.email.trim().toLowerCase() === actUserId)
      );
    }
    if (!matchedUser && actUserName) {
      matchedUser = users.find(u => u.name.trim().toLowerCase() === actUserName);
    }

    const groupKey = matchedUser ? matchedUser.id : (act.userId || act.userName.toLowerCase());
    const displayName = matchedUser ? matchedUser.name : act.userName;

    if (!userMap.has(groupKey)) {
      userMap.set(groupKey, {
        user: matchedUser || null,
        name: displayName,
        acts: [],
      });
    }
    userMap.get(groupKey)!.acts.push(act);
  });

  // 2. Pick the FIRST activity (earliest CreatedAt/time) for each user
  const firstActivities: TeamActivity[] = [];

  userMap.forEach(group => {
    if (group.acts.length === 0) return;
    // Sort ascending: earliest time first
    const sorted = [...group.acts].sort((a, b) => {
      const tsA = parseActivityTimestamp(a.date, a.time);
      const tsB = parseActivityTimestamp(b.date, b.time);
      return tsA - tsB;
    });

    firstActivities.push(sorted[0]);
  });

  // Sort the final user list chronologically by time ascending
  firstActivities.sort((a, b) => {
    const tsA = parseActivityTimestamp(a.date, a.time);
    const tsB = parseActivityTimestamp(b.date, b.time);
    return tsA - tsB;
  });

  const total = firstActivities.length;
  if (onProgress) onProgress(0, total);

  // 3. Resolve addresses from coordinates concurrently (5 parallel workers for speed & smoothness)
  let completedCount = 0;

  const excelRows = await mapConcurrent<TeamActivity, FirstActivityRow>(
    firstActivities,
    5,
    async (act) => {
      // Format clean time
      let rawTime = (act.time || '').trim();
      rawTime = rawTime.replace(/^(\d):/, '0$1:');
      const timeFormatted = formatWaktuDisplay(act.date, rawTime) || rawTime || act.date || '-';

      // Format coordinates
      const coordStr =
        !isNaN(act.lat) && !isNaN(act.lng)
          ? `${act.lat.toFixed(6)}, ${act.lng.toFixed(6)}`
          : '-';

      // Reverse geocode address from coordinates
      let address = '-';
      if (!isNaN(act.lat) && !isNaN(act.lng)) {
        const fallbackLocation =
          act.locationName && act.locationName !== 'Lokasi Lapangan' && !act.locationName.includes('google.com/maps')
            ? act.locationName
            : (act.siteName ? `${act.siteId ? act.siteId + ' - ' : ''}${act.siteName}` : undefined);

        address = await reverseGeocodeCoordinate(act.lat, act.lng, fallbackLocation);
      }

      completedCount++;
      if (onProgress) onProgress(completedCount, total);

      return {
        No: 0, // Assigned sequentially after mapping
        Time: timeFormatted,
        'User Name': act.userName,
        Status: act.status || 'Selesai',
        Koordinat: coordStr,
        Alamat: address,
      };
    }
  );

  // Assign sequential 1-based row numbers
  excelRows.forEach((row, idx) => {
    row.No = idx + 1;
  });

  // 4. Construct Excel Workbook using SheetJS (XLSX)
  const worksheet = XLSX.utils.json_to_sheet(excelRows, {
    header: ['No', 'Time', 'User Name', 'Status', 'Koordinat', 'Alamat'],
  });

  // Auto-size columns nicely
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Time
    { wch: 28 }, // User Name
    { wch: 14 }, // Status
    { wch: 26 }, // Koordinat
    { wch: 65 }, // Alamat
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktivitas Pertama');

  // 5. Generate descriptive file name
  const dateTag = filter.selectedDate && filter.selectedDate !== 'ALL'
    ? filter.selectedDate
    : new Date().toISOString().split('T')[0];
  const clusterTag = filter.cluster && filter.cluster !== 'ALL' ? `_${filter.cluster}` : '';
  const subDivTag = filter.subDivision && filter.subDivision !== 'ALL' ? `_${filter.subDivision}` : '';

  const fileName = `Aktivitas_Pertama_User_${dateTag}${clusterTag}${subDivTag}.xlsx`;

  // 6. Download Excel file
  XLSX.writeFile(workbook, fileName);

  return { totalExported: total, fileName };
}
