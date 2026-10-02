/**
 * Reverse Geocoding Service for Indonesian Coordinates
 * Handles coordinate formatting, caching, client-side reverse geocoding (OSM Nominatim & BigDataCloud),
 * and high-accuracy offline fallback for Greater Jakarta / West Java areas.
 */

// In-memory cache for instant lookups during session
const addressCache = new Map<string, string>();

/**
 * Format coordinates as clean string: e.g. "-6.227920, 106.932650"
 */
export function formatCoordinate(lat: number, lng: number): string {
  if (isNaN(lat) || isNaN(lng)) return '-';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Generates cache key for coordinates with 4-5 decimal places precision (~1-10 meters)
 */
export function getCoordKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * High-accuracy fallback reverse geocoder for Greater Jakarta (Jabodetabek) and surrounding West Java.
 * Used when offline, during network loading, or if third-party APIs are throttled.
 */
interface GeoArea {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  address: string;
}

const KNOWN_AREAS: GeoArea[] = [
  // Kota Bekasi
  { name: 'Bekasi Timur', lat: -6.248, lng: 106.995, radiusKm: 4.5, address: 'Margahayu, Kec. Bekasi Timur, Kota Bekasi, Jawa Barat' },
  { name: 'Bekasi Barat', lat: -6.236, lng: 106.974, radiusKm: 4.0, address: 'Kranji, Kec. Bekasi Barat, Kota Bekasi, Jawa Barat' },
  { name: 'Bekasi Selatan', lat: -6.255, lng: 106.978, radiusKm: 4.0, address: 'Pekayon Jaya, Kec. Bekasi Selatan, Kota Bekasi, Jawa Barat' },
  { name: 'Bekasi Utara', lat: -6.215, lng: 107.001, radiusKm: 4.5, address: 'Harapan Baru, Kec. Bekasi Utara, Kota Bekasi, Jawa Barat' },
  { name: 'Rawalumbu', lat: -6.282, lng: 106.996, radiusKm: 3.5, address: 'Bojong Rawalumbu, Kec. Rawalumbu, Kota Bekasi, Jawa Barat' },
  { name: 'Mustika Jaya', lat: -6.305, lng: 107.025, radiusKm: 4.0, address: 'Padurenan, Kec. Mustika Jaya, Kota Bekasi, Jawa Barat' },
  { name: 'Pondok Gede', lat: -6.285, lng: 106.912, radiusKm: 4.0, address: 'Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat' },
  { name: 'Jatiasih', lat: -6.305, lng: 106.958, radiusKm: 4.0, address: 'Jatisari, Kec. Jatiasih, Kota Bekasi, Jawa Barat' },
  { name: 'Jatisampurna', lat: -6.345, lng: 106.935, radiusKm: 4.5, address: 'Jatikarya, Kec. Jatisampurna, Kota Bekasi, Jawa Barat' },
  { name: 'Bantar Gebang', lat: -6.340, lng: 106.995, radiusKm: 4.0, address: 'Bantar Gebang, Kota Bekasi, Jawa Barat' },

  // Kabupaten Bekasi
  { name: 'Tambun Selatan', lat: -6.265, lng: 107.058, radiusKm: 5.0, address: 'Setiadarma, Kec. Tambun Selatan, Kab. Bekasi, Jawa Barat' },
  { name: 'Tambun Utara', lat: -6.210, lng: 107.065, radiusKm: 5.0, address: 'Sriamur, Kec. Tambun Utara, Kab. Bekasi, Jawa Barat' },
  { name: 'Cibitung', lat: -6.262, lng: 107.098, radiusKm: 5.0, address: 'Wanasari, Kec. Cibitung, Kab. Bekasi, Jawa Barat' },
  { name: 'Cikarang Barat', lat: -6.285, lng: 107.135, radiusKm: 6.0, address: 'Kawasan Industri MM2100, Cikarang Barat, Kab. Bekasi, Jawa Barat' },
  { name: 'Cikarang Utara', lat: -6.275, lng: 107.165, radiusKm: 5.5, address: 'Karangasih, Kec. Cikarang Utara, Kab. Bekasi, Jawa Barat' },
  { name: 'Cikarang Selatan', lat: -6.328, lng: 107.138, radiusKm: 5.5, address: 'Lippo Cikarang, Kec. Cikarang Selatan, Kab. Bekasi, Jawa Barat' },
  { name: 'Cikarang Pusat', lat: -6.365, lng: 107.175, radiusKm: 6.0, address: 'Delta Mas, Kec. Cikarang Pusat, Kab. Bekasi, Jawa Barat' },

  // DKI Jakarta - Jakarta Timur
  { name: 'Duren Sawit', lat: -6.228, lng: 106.915, radiusKm: 4.0, address: 'Pondok Kelapa, Kec. Duren Sawit, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Jatinegara', lat: -6.230, lng: 106.872, radiusKm: 3.5, address: 'Bidara Cina, Kec. Jatinegara, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Cakung', lat: -6.195, lng: 106.945, radiusKm: 4.5, address: 'Penggilingan, Kec. Cakung, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Matraman', lat: -6.202, lng: 106.862, radiusKm: 3.0, address: 'Utan Kayu Selatan, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Pulogadung', lat: -6.192, lng: 106.895, radiusKm: 3.5, address: 'Rawamangun, Kec. Pulo Gadung, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Kramat Jati', lat: -6.272, lng: 106.868, radiusKm: 3.5, address: 'Cawang, Kec. Kramat Jati, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Pasar Rebo', lat: -6.325, lng: 106.865, radiusKm: 4.0, address: 'Kalisari, Kec. Pasar Rebo, Kota Jakarta Timur, DKI Jakarta' },
  { name: 'Ciracas', lat: -6.335, lng: 106.885, radiusKm: 4.0, address: 'Kelapa Dua Wetan, Kec. Ciracas, Kota Jakarta Timur, DKI Jakarta' },

  // DKI Jakarta - Jakarta Pusat
  { name: 'Cempaka Putih', lat: -6.182, lng: 106.870, radiusKm: 3.0, address: 'Cempaka Putih Timur, Kec. Cempaka Putih, Kota Jakarta Pusat, DKI Jakarta' },
  { name: 'Kemayoran', lat: -6.160, lng: 106.858, radiusKm: 3.5, address: 'Gunung Sahari Selatan, Kec. Kemayoran, Kota Jakarta Pusat, DKI Jakarta' },
  { name: 'Menteng', lat: -6.195, lng: 106.832, radiusKm: 3.0, address: 'Gondangdia, Kec. Menteng, Kota Jakarta Pusat, DKI Jakarta' },
  { name: 'Tanah Abang', lat: -6.205, lng: 106.815, radiusKm: 3.5, address: 'Kebon Kacang, Kec. Tanah Abang, Kota Jakarta Pusat, DKI Jakarta' },

  // DKI Jakarta - Jakarta Selatan
  { name: 'Tebet', lat: -6.235, lng: 106.852, radiusKm: 3.0, address: 'Manggarai Selatan, Kec. Tebet, Kota Jakarta Selatan, DKI Jakarta' },
  { name: 'Kebayoran Baru', lat: -6.242, lng: 106.802, radiusKm: 3.5, address: 'Senayan, Kec. Kebayoran Baru, Kota Jakarta Selatan, DKI Jakarta' },
  { name: 'Cilandak', lat: -6.295, lng: 106.802, radiusKm: 4.0, address: 'Fatmawati, Kec. Cilandak, Kota Jakarta Selatan, DKI Jakarta' },
  { name: 'Pasar Minggu', lat: -6.288, lng: 106.838, radiusKm: 4.0, address: 'Pejaten Barat, Kec. Pasar Minggu, Kota Jakarta Selatan, DKI Jakarta' },
  { name: 'Jagakarsa', lat: -6.340, lng: 106.825, radiusKm: 4.5, address: 'Ciganjur, Kec. Jagakarsa, Kota Jakarta Selatan, DKI Jakarta' },

  // DKI Jakarta - Jakarta Utara & Barat
  { name: 'Kelapa Gading', lat: -6.160, lng: 106.908, radiusKm: 4.0, address: 'Kelapa Gading Timur, Kota Jakarta Utara, DKI Jakarta' },
  { name: 'Tanjung Priok', lat: -6.128, lng: 106.885, radiusKm: 4.5, address: 'Sunter Agung, Kec. Tanjung Priok, Kota Jakarta Utara, DKI Jakarta' },
  { name: 'Grogol Petamburan', lat: -6.168, lng: 106.788, radiusKm: 3.5, address: 'Tanjung Duren, Kec. Grogol Petamburan, Kota Jakarta Barat, DKI Jakarta' },

  // Kota Depok
  { name: 'Beji', lat: -6.375, lng: 106.822, radiusKm: 3.5, address: 'Kemiri Muka, Kec. Beji, Kota Depok, Jawa Barat' },
  { name: 'Pancoran Mas', lat: -6.398, lng: 106.808, radiusKm: 4.0, address: 'Depok Jaya, Kec. Pancoran Mas, Kota Depok, Jawa Barat' },
  { name: 'Cimanggis', lat: -6.365, lng: 106.872, radiusKm: 4.5, address: 'Harjamukti, Kec. Cimanggis, Kota Depok, Jawa Barat' },
  { name: 'Sukmajaya', lat: -6.402, lng: 106.845, radiusKm: 4.0, address: 'Baktijaya, Kec. Sukmajaya, Kota Depok, Jawa Barat' },

  // Kabupaten Bogor & Kota Bogor
  { name: 'Cibinong', lat: -6.482, lng: 106.852, radiusKm: 5.0, address: 'Cirimekar, Kec. Cibinong, Kab. Bogor, Jawa Barat' },
  { name: 'Bojong Gede', lat: -6.495, lng: 106.798, radiusKm: 5.0, address: 'Pabuaran, Kec. Bojong Gede, Kab. Bogor, Jawa Barat' },
  { name: 'Kemang / Parung', lat: -6.495, lng: 106.742, radiusKm: 6.0, address: 'Kec. Kemang / Parung, Kab. Bogor, Jawa Barat' },
  { name: 'Bogor Tengah', lat: -6.595, lng: 106.795, radiusKm: 4.5, address: 'Babakan, Kec. Bogor Tengah, Kota Bogor, Jawa Barat' },

  // Karawang
  { name: 'Karawang Barat', lat: -6.312, lng: 107.295, radiusKm: 7.0, address: 'Nagasari, Kec. Karawang Barat, Kab. Karawang, Jawa Barat' },
  { name: 'Telukjambe Timur', lat: -6.345, lng: 107.285, radiusKm: 7.0, address: 'Sukaharja, Kec. Telukjambe Timur, Kab. Karawang, Jawa Barat' },
];

/**
 * Calculates approximate distance in kilometers between two lat/lng coordinates (Haversine Formula)
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the closest matched administrative area based on geographic coordinates
 */
export function getFallbackAddress(lat: number, lng: number): string {
  let closest: GeoArea | null = null;
  let minDistance = Infinity;

  for (const area of KNOWN_AREAS) {
    const dist = getDistanceKm(lat, lng, area.lat, area.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = area;
    }
  }

  if (closest && minDistance <= (closest.radiusKm * 1.8)) {
    return closest.address;
  }

  // General bounding regional heuristics
  if (lat >= -6.40 && lat <= -6.15 && lng >= 106.90 && lng <= 107.10) {
    return 'Wilayah Kota / Kab. Bekasi, Jawa Barat';
  }
  if (lat >= -6.40 && lat <= -6.10 && lng >= 106.70 && lng <= 106.95) {
    return 'Wilayah DKI Jakarta';
  }
  if (lat >= -6.45 && lat <= -6.32 && lng >= 106.75 && lng <= 106.92) {
    return 'Wilayah Kota Depok, Jawa Barat';
  }
  if (lat >= -6.70 && lat <= -6.42 && lng >= 106.65 && lng <= 107.05) {
    return 'Wilayah Bogor, Jawa Barat';
  }
  if (lat >= -6.45 && lat <= -6.15 && lng >= 107.15 && lng <= 107.45) {
    return 'Wilayah Karawang, Jawa Barat';
  }

  return `Koordinat (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Main reverse geocoding function:
 * 1. Checks memory cache
 * 2. Checks localStorage cache
 * 3. Fetches OpenStreetMap Nominatim reverse API
 * 4. Fallback to BigDataCloud reverse API
 * 5. Fallback to high-precision regional administrative lookup
 */
export async function getAddressFromCoords(
  lat: number,
  lng: number,
  skipCache = false
): Promise<string> {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return 'Koordinat tidak valid';
  }

  const key = getCoordKey(lat, lng);

  // 1. Check in-memory cache
  if (!skipCache && addressCache.has(key)) {
    return addressCache.get(key)!;
  }

  // 2. Check localStorage cache
  if (!skipCache && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(`depotel_addr_${key}`);
      if (stored && stored.trim()) {
        addressCache.set(key, stored);
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // 3. Client-side reverse geocoding via OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts: string[] = [];

        // Street / POI
        const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street;
        const houseNumber = addr.house_number;
        if (road) {
          parts.push(houseNumber ? `${road} No. ${houseNumber}` : road);
        } else if (addr.building || addr.amenity || addr.shop || addr.office) {
          parts.push(addr.building || addr.amenity || addr.shop || addr.office);
        }

        // Kelurahan / Desa / Lingkungan
        const sub = addr.neighbourhood || addr.suburb || addr.village || addr.hamlet;
        if (sub && !parts.includes(sub)) {
          parts.push(sub);
        }

        // Kecamatan
        const district = addr.city_district || addr.district || addr.subdistrict;
        if (district && !parts.includes(district)) {
          parts.push(`Kec. ${district.replace(/^kecamatan\s*/i, '')}`);
        }

        // Kota / Kabupaten
        const city = addr.city || addr.town || addr.county || addr.regency;
        if (city && !parts.includes(city)) {
          parts.push(city);
        }

        // Provinsi
        const state = addr.state;
        if (state && !parts.includes(state)) {
          parts.push(state);
        }

        // Postcode
        if (addr.postcode) {
          parts.push(addr.postcode);
        }

        const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name || '');
        if (formatted && formatted.length > 3) {
          addressCache.set(key, formatted);
          try {
            window.localStorage?.setItem(`depotel_addr_${key}`, formatted);
          } catch {}
          return formatted;
        }
      }
    }
  } catch {
    // Nominatim fetch failed or timed out, continue to fallback
  }

  // 4. Fallback to BigDataCloud client API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
    const res = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality,
        data.city,
        data.principalSubdivision,
        data.postcode,
      ].filter(Boolean);

      if (parts.length > 0) {
        const formatted = parts.join(', ');
        addressCache.set(key, formatted);
        try {
          window.localStorage?.setItem(`depotel_addr_${key}`, formatted);
        } catch {}
        return formatted;
      }
    }
  } catch {
    // BigDataCloud failed or blocked
  }

  // 5. High-precision offline fallback
  const fallback = getFallbackAddress(lat, lng);
  addressCache.set(key, fallback);
  return fallback;
}
