import { TeamUser, TeamActivity } from '../types';
import { formatPhotoUrl } from '../utils/photo';

export const DEFAULT_SHEET_ID = '1H39tuO0E_WLJUtl6ebzH4w3kd76XZa9rMLadwDuxwQs';

// Predefined vibrant colors for team users
const TEAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

// Fallback sample data in case sheet is offline or empty
const SAMPLE_USERS: TeamUser[] = [
  {
    id: 'USR001',
    name: 'Budi Santoso',
    role: 'Field Supervisor',
    team: 'FMS',
    division: 'FMS',
    subDivision: 'CM',
    cluster: 'BEKASI',
    email: 'budi.santoso@company.co.id',
    phone: '081234567890',
    color: '#3B82F6',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR002',
    name: 'Siti Rahmawati',
    role: 'Account Executive',
    team: 'FMS',
    division: 'FMS',
    subDivision: 'MR',
    cluster: 'BEKASI',
    email: 'siti.rahmawati@company.co.id',
    phone: '081987654321',
    color: '#10B981',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR003',
    name: 'Ahmad Fauzi',
    role: 'Quality Inspector',
    team: 'FMS',
    division: 'FMS',
    subDivision: 'MBP',
    cluster: 'BEKASI',
    email: 'ahmad.fauzi@company.co.id',
    phone: '085612345678',
    color: '#F59E0B',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR004',
    name: 'Dewi Lestari',
    role: 'Technical Surveyor',
    team: 'FMS',
    division: 'FMS',
    subDivision: 'CM',
    cluster: 'BEKASI',
    email: 'dewi.lestari@company.co.id',
    phone: '087890123456',
    color: '#EC4899',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR005',
    name: 'Rizky Pratama',
    role: 'Logistics Coordinator',
    team: 'FMS',
    division: 'FMS',
    subDivision: 'OM',
    cluster: 'BEKASI',
    email: 'rizky.pratama@company.co.id',
    phone: '082134567891',
    color: '#8B5CF6',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

const getTodayString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export function getSiteDisplay(activity: TeamActivity): string {
  if (activity.siteId && activity.siteName) {
    return `${activity.siteId} - ${activity.siteName}`;
  }
  if (activity.siteName) return activity.siteName;
  if (activity.siteId) return activity.siteId;
  return activity.locationName || activity.title || 'Lokasi Lapangan';
}

export function formatWaktuDisplay(dateStr?: string, timeStr?: string): string {
  if (!timeStr) return dateStr || '';
  const trimmedTime = timeStr.trim();
  const trimmedDate = (dateStr || '').trim();

  // If timeStr already contains a full date (e.g. "18/9/2026, 09.18.59" or "2026-09-18 09:18:59")
  if (/\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/.test(trimmedTime)) {
    return trimmedTime;
  }

  if (!trimmedDate) return trimmedTime;

  if (trimmedTime.includes(trimmedDate)) {
    return trimmedTime;
  }

  return `${trimmedDate} ${trimmedTime}`;
}

const SAMPLE_ACTIVITIES: TeamActivity[] = [
  {
    id: 'ACT101',
    userId: 'USR001',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'CM',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '08:30:00',
    siteId: 'JKT249',
    siteName: 'KLPDUAWETAN',
    title: 'Briefing Lapangan & Briefing K3',
    description: 'Pengecekan kesiapan tim dan APD sebelum inspeksi area proyek SCBD.',
    locationName: 'Proyek SCBD Lot 11, Jakarta Selatan',
    lat: -6.2255,
    lng: 106.8095,
    category: 'Briefing',
    status: 'Selesai',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ACT102',
    userId: 'USR001',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'CM',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '11:15:00',
    siteId: 'JKT102',
    siteName: 'WISMA NUSANTARA',
    title: 'Inspeksi Struktur Pondasi Phase 2',
    description: 'Pemeriksaan kualitas cor beton dan besi tulangan struktur lantai dasar.',
    locationName: 'Gedung Wisma Nusantara, MH Thamrin, Jakarta Pusat',
    lat: -6.1935,
    lng: 106.8231,
    category: 'Inspeksi',
    status: 'Selesai',
    photoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ACT103',
    userId: 'USR001',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'CM',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '14:45:00',
    siteId: 'JKT088',
    siteName: 'PULOGADUNG',
    title: 'Supervisi Pemasangan Fasilitas Listrik',
    description: 'Mendampingi teknisi gardu utama dan pengujian tegangan listrik panel B.',
    locationName: 'Kawasan Industri Pulogadung, Jakarta Timur',
    lat: -6.1950,
    lng: 106.9150,
    category: 'Inspeksi',
    status: 'Dalam Proses',
  },
  {
    id: 'ACT104',
    userId: 'USR002',
    userName: 'Siti Rahmawati',
    userEmail: 'siti.rahmawati@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'MR',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '09:45:00',
    siteId: 'JKT312',
    siteName: 'TELKOM LANDMARK',
    title: 'Meeting Kemitraan Strategis PT Telkom',
    description: 'Presentasi proposal ekspansi jaringan serat optik regional Jabodetabek.',
    locationName: 'Telkom Landmark Tower, Gatot Subroto, Jakarta',
    lat: -6.2300,
    lng: 106.8188,
    category: 'Meeting',
    status: 'Selesai',
  },
  {
    id: 'ACT105',
    userId: 'USR002',
    userName: 'Siti Rahmawati',
    userEmail: 'siti.rahmawati@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'MR',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '13:30',
    title: 'Kunjungan Client PT Bank Mandiri',
    description: 'Diskusi pembaruan kontrak pemeliharaan tahunan dan Demo fitur baru.',
    locationName: 'Plaza Mandiri, Jl. Jend Gatot Subroto, Jakarta',
    lat: -6.2238,
    lng: 106.8099,
    category: 'Kunjungan Client',
    status: 'Selesai',
  },
  {
    id: 'ACT106',
    userId: 'USR003',
    userName: 'Ahmad Fauzi',
    userEmail: 'ahmad.fauzi@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'MBP',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '10:00',
    title: 'Audit ISO Quality Standard',
    description: 'Verifikasi dokumen QA/QC lapangan dan sertifikasi peralatan uji.',
    locationName: 'Depo Logistik Sunter, Jakarta Utara',
    lat: -6.1402,
    lng: 106.8711,
    category: 'Inspeksi',
    status: 'Selesai',
  },
  {
    id: 'ACT107',
    userId: 'USR003',
    userName: 'Ahmad Fauzi',
    userEmail: 'ahmad.fauzi@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'MBP',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '15:20',
    title: 'Pengujian Sampel Material Beton',
    description: 'Pengambilan sampel silinder beton di batching plant Kalimalang.',
    locationName: 'Batching Plant Kalimalang, Bekasi',
    lat: -6.2488,
    lng: 106.9602,
    category: 'Survei',
    status: 'Dalam Proses',
  },
  {
    id: 'ACT108',
    userId: 'USR004',
    userName: 'Dewi Lestari',
    userEmail: 'dewi.lestari@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'CM',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '09:00',
    title: 'Survei Topografi Jalur Tol',
    description: 'Pengukuran elevasi tanah menggunakan Total Station dan Drone RTK.',
    locationName: 'Rest Area KM 19 Tol Cikampek, Bekasi',
    lat: -6.2625,
    lng: 107.0150,
    category: 'Survei',
    status: 'Selesai',
  },
  {
    id: 'ACT109',
    userId: 'USR004',
    userName: 'Dewi Lestari',
    userEmail: 'dewi.lestari@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'CM',
    userCluster: 'BEKASI',
    date: getTodayString(0),
    time: '14:00',
    title: 'Pemetaan Lahan Titik Tower Telekomunikasi',
    description: 'Pengecekan koordinat GPS batas tanah pembebasan di Cikarang.',
    locationName: 'Kawasan Delta Silicon, Cikarang',
    lat: -6.3211,
    lng: 107.1350,
    category: 'Survei',
    status: 'Rencana',
  },
  {
    id: 'ACT110',
    userId: 'USR005',
    userName: 'Rizky Pratama',
    userEmail: 'rizky.pratama@company.co.id',
    userDivision: 'FMS',
    userSubDivision: 'OM',
    userCluster: 'BEKASI',
    date: getTodayString(-1),
    time: '11:00',
    title: 'Pengiriman Material Konstruksi Heavy Duty',
    description: 'Mengkoordinasikan bongkar muat 3 unit kontainer baja struktural.',
    locationName: 'Pelabuhan Tanjung Priok, Jakarta Utara',
    lat: -6.1088,
    lng: 106.8833,
    category: 'Lainnya',
    status: 'Selesai',
  },
];

// Helper to normalize header names
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to parse CSV text safely
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// Convert Users rows to TeamUser objects (scans up to Column O)
function parseUsersRows(rows: string[][]): TeamUser[] {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (keys: string[]) =>
    headers.findIndex(h => keys.some(k => h.includes(k)));

  const idIdx = findIndex(['id', 'userid', 'iduser', 'kode', 'nik']);
  const nameIdx = findIndex(['nama', 'name', 'user', 'petugas', 'personil', 'namalengkap']);
  const roleIdx = findIndex(['role', 'jabatan', 'posisi', 'title']);
  const teamIdx = findIndex(['tim', 'team', 'divisi', 'dept', 'department', 'unit', 'bagian', 'sektor']);
  const subDivIdx = findIndex(['subdivisi', 'subdiv', 'subdivision', 'sub_divisi', 'sub_division', 'subteam', 'sub_team', 'sub']);
  const clusterIdx = findIndex(['cluster', 'klaster', 'wilayah', 'area', 'rayon']);
  const emailIdx = findIndex(['email', 'mail', 'surel']);
  const phoneIdx = findIndex(['phone', 'nohp', 'hp', 'telepon', 'wa', 'whatsapp', 'kontak']);
  const colorIdx = findIndex(['color', 'warna']);
  const avatarIdx = findIndex(['avatar', 'foto', 'photo', 'image', 'gambar']);

  const users: TeamUser[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const colA = row.length > 0 && row[0] ? row[0].trim() : '';
    const colB = row.length > 1 && row[1] ? row[1].trim() : '';
    const colC = row.length > 2 && row[2] ? row[2].trim() : ''; // Column C of Users sheet
    const colG = row.length > 6 && row[6] ? row[6].trim() : ''; // Column G of Users sheet (Divisi)
    const colH = row.length > 7 && row[7] ? row[7].trim() : ''; // Column H of Users sheet (Sub Divisi: MR, CM, MBP)
    const colO = row.length > 14 && row[14] ? row[14].trim() : ''; // Column O of Users sheet (Cluster)

    // Priority for Column C as requested by user
    const name = colC || (nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : (colA || `User ${i}`));
    const id = idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : (colA || `USR${String(i).padStart(3, '0')}`);
    const role = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].trim() : 'Anggota Tim';
    const divisionCol = colG || (teamIdx !== -1 && row[teamIdx] ? row[teamIdx].trim() : '');

    // Strict filter: ONLY include users whose Division column explicitly contains "FMS".
    // Blank/empty entries or non-FMS divisions (e.g. NOC, IT, HR, or blank) are excluded.
    if (!divisionCol || !divisionCol.toUpperCase().includes('FMS')) {
      continue;
    }

    const team = divisionCol;
    const division = divisionCol;
    let subDivision = (subDivIdx !== -1 && row[subDivIdx] ? row[subDivIdx].trim() : colH) || '';
    if (['-', '—', '–', 'none', 'null'].includes(subDivision.toLowerCase()) || subDivision.replace(/[-_.\s]/g, '') === '') {
      subDivision = '';
    }

    // Standardize Sub Division format
    if (subDivision.toUpperCase().includes('MBP')) {
      subDivision = 'MBP';
    } else if (subDivision.toUpperCase().includes('MR')) {
      subDivision = 'MR';
    } else if (subDivision.toUpperCase().includes('CM')) {
      subDivision = 'CM';
    }

    // Ensure User "Junaedi" is assigned to MBP
    if (name.toLowerCase().includes('junaedi')) {
      subDivision = 'MBP';
    }

    const cluster = colO || (clusterIdx !== -1 && row[clusterIdx] ? row[clusterIdx].trim() : '');
    const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : (colA.includes('@') ? colA : (colB.includes('@') ? colB : colA));
    const phone = phoneIdx !== -1 ? row[phoneIdx] : undefined;
    const color = colorIdx !== -1 && row[colorIdx] ? row[colorIdx] : TEAM_COLORS[(i - 1) % TEAM_COLORS.length];
    const avatar = avatarIdx !== -1 && row[avatarIdx] ? row[avatarIdx] : undefined;

    users.push({
      id,
      name,
      role,
      team,
      division,
      subDivision,
      cluster,
      email,
      phone,
      color,
      avatar,
    });
  }

  return users;
}

// Convert Activity rows to TeamActivity objects
function parseActivityRows(rows: string[][], knownUsers: TeamUser[]): TeamActivity[] {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (keys: string[]) =>
    headers.findIndex(h => keys.some(k => h.includes(k)));

  const idIdx = findIndex(['id', 'idactivity', 'activityid', 'no']);
  const emailIdx = findIndex(['email', 'useremail', 'emailuser', 'pelaksanaemail', 'mail', 'surel']);
  const userIdx = findIndex(['userid', 'iduser', 'user', 'nama', 'petugas', 'pelaksana']);
  const dateIdx = findIndex(['tanggal', 'date', 'tgl', 'timestamp']);
  const timeIdx = findIndex(['time', 'jam', 'waktu']);
  const siteIdIdx = findIndex(['siteid', 'site_id', 'site id', 'kodesite', 'kode site']);
  const siteNameIdx = findIndex(['sitename', 'site_name', 'site name', 'namasite', 'nama site']);
  const titleIdx = findIndex(['judul', 'title', 'kegiatan', 'aktivitas', 'activity', 'namaaktivitas']);
  const descIdx = findIndex(['deskripsi', 'description', 'keterangan', 'notes', 'catatan', 'detail']);
  const locIdx = findIndex(['lokasi', 'location', 'tempat', 'alamat', 'namalokasi']);
  const latIdx = findIndex(['latitude', 'lat']);
  const lngIdx = findIndex(['longitude', 'lng', 'long']);
  const coordIdx = findIndex(['koordinat', 'latlng', 'coordinate', 'posisi']);
  const catIdx = findIndex(['kategori', 'category', 'jenis', 'tipe']);
  const statusIdx = findIndex(['status', 'keadaan', 'progres', 'progress']);
  const photoIdx = findIndex(['foto', 'photo', 'bukti', 'gambar', 'image']);

  const activities: TeamActivity[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Extract Activity.UserEmail
    let actUserEmail = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
    const rawUserCell = userIdx !== -1 && row[userIdx] ? row[userIdx].trim() : '';

    // Exclude activities for non-FMS personnel (such as Andreas A. Prasetyo)
    const lowerRawUser = rawUserCell.toLowerCase();
    const lowerActEmail = actUserEmail.toLowerCase();
    if (
      lowerRawUser.includes('andreas') ||
      lowerActEmail.includes('andreas')
    ) {
      continue;
    }

    if (!actUserEmail) {
      if (rawUserCell.includes('@')) {
        actUserEmail = rawUserCell;
      } else {
        // Scan row for email pattern
        for (const cell of row) {
          if (cell && cell.includes('@') && cell.includes('.')) {
            actUserEmail = cell.trim();
            break;
          }
        }
      }
    }

    // Database JOIN: Activity.UserEmail <> Users.Email
    let matchedUser = knownUsers.find(u => {
      if (actUserEmail && u.email) {
        return u.email.trim().toLowerCase() === actUserEmail.toLowerCase();
      }
      return false;
    });

    // Fallback JOIN if email is omitted in Activity sheet or formatted differently
    if (!matchedUser && rawUserCell) {
      const rCell = rawUserCell.toLowerCase();
      matchedUser = knownUsers.find(u => {
        const uId = u.id.toLowerCase();
        const uName = u.name.toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        return uId === rCell || uName === rCell || (uEmail && rCell.includes(uEmail));
      });
    }

    // Exclude activity if the user is not part of the FMS team (knownUsers)
    if (!matchedUser) {
      continue;
    }

    // Joined fields from Users sheet (User Name, Divisi, Sub Divisi, Cluster)
    const userId = matchedUser ? matchedUser.id : (actUserEmail ? `USR_${actUserEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : 'USR001');
    const userName = matchedUser ? matchedUser.name : (actUserEmail ? actUserEmail.split('@')[0] : 'Anggota Tim'); // Column C of Users
    const userDivision = matchedUser ? (matchedUser.division || matchedUser.team) : ''; // Column G of Users
    const userSubDivision = matchedUser ? matchedUser.subDivision : ''; // Column H of Users
    const userCluster = matchedUser ? matchedUser.cluster : ''; // Column O of Users
    const userTeam = matchedUser ? matchedUser.team : userDivision;
    const userRole = matchedUser ? matchedUser.role : 'Anggota Tim';

    const id = idIdx !== -1 && row[idIdx] ? row[idIdx] : `ACT${100 + i}`;

    let rawDate = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : getTodayString();
    let rawTime = timeIdx !== -1 && row[timeIdx] ? row[timeIdx] : '09:00';

    // Parse Column E (SiteID) and Column F (SiteName)
    const siteId = siteIdIdx !== -1 && row[siteIdIdx] ? row[siteIdIdx] : (row[4] && row.length > 4 ? row[4] : '');
    const siteName = siteNameIdx !== -1 && row[siteNameIdx] ? row[siteNameIdx] : (row[5] && row.length > 5 ? row[5] : '');

    const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : `Aktivitas ${i}`;
    const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : '-';
    const locationName = locIdx !== -1 && row[locIdx] ? row[locIdx] : 'Lokasi Lapangan';

    // Parse latitude and longitude
    let lat: number | null = null;
    let lng: number | null = null;

    // First: Check explicit latIdx and lngIdx
    if (latIdx !== -1 && row[latIdx] && !isNaN(parseFloat(row[latIdx]))) {
      const pLat = parseFloat(row[latIdx]);
      if (pLat >= -11 && pLat <= 6) lat = pLat;
    }
    if (lngIdx !== -1 && row[lngIdx] && !isNaN(parseFloat(row[lngIdx]))) {
      const pLng = parseFloat(row[lngIdx]);
      if (pLng >= 95 && pLng <= 141) lng = pLng;
    }

    // Second: Check coordIdx column or scan every cell in row for coordinate pairs
    if (lat === null || lng === null) {
      for (let c = 0; c < row.length; c++) {
        const cellVal = row[c];
        if (!cellVal) continue;
        const match = cellVal.match(/(-?\d{1,2}\.\d+)[,\s]+(1\d{2}\.\d+)/);
        if (match) {
          const pLat = parseFloat(match[1]);
          const pLng = parseFloat(match[2]);
          if (!isNaN(pLat) && !isNaN(pLng) && pLat >= -11 && pLat <= 6 && pLng >= 95 && pLng <= 141) {
            lat = pLat;
            lng = pLng;
            break;
          }
        }
      }
    }

    // Third: If activity has no explicit GPS coordinates in sheet (e.g. non-onsite activity),
    // generate a deterministic spatial coordinate so EVERY activity appears as a marker on the map
    if (lat === null || lng === null) {
      const keyStr = (siteId || siteName || locationName || title || userName || `act_${i}`).toLowerCase();
      let hash = 0;
      for (let k = 0; k < keyStr.length; k++) {
        hash = (hash << 5) - hash + keyStr.charCodeAt(k);
        hash |= 0;
      }
      const baseLat = -6.2088 + ((Math.abs(hash) % 1200) / 4000) - 0.15;
      const baseLng = 106.8456 + ((Math.abs(hash * 3) % 1200) / 4000) - 0.15;

      const angle = i * 0.7;
      const radius = 0.002 * ((i % 8) + 1);
      lat = baseLat + Math.sin(angle) * radius;
      lng = baseLng + Math.cos(angle) * radius;
    }

    const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Aktivitas';
    const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx] : 'Selesai';
    const rawPhoto = photoIdx !== -1 && row[photoIdx] ? row[photoIdx] : undefined;
    const photoUrl = rawPhoto ? formatPhotoUrl(rawPhoto) : undefined;

    activities.push({
      id,
      userId,
      userName,
      userEmail: matchedUser?.email || actUserEmail,
      userTeam,
      userRole,
      userDivision,
      userSubDivision,
      userCluster,
      date: rawDate,
      time: rawTime,
      siteId,
      siteName,
      title,
      description,
      locationName,
      lat,
      lng,
      category,
      status,
      photoUrl,
    });
  }

  // Ensure no two activities share identical coordinates so every activity is individually visible as a marker
  const coordMap: { [key: string]: number } = {};
  for (const act of activities) {
    const key = `${act.lat.toFixed(5)},${act.lng.toFixed(5)}`;
    if (coordMap[key] !== undefined) {
      coordMap[key] += 1;
      const count = coordMap[key];
      const angle = count * 1.25;
      const offset = 0.0003 * count;
      act.lat += Math.sin(angle) * offset;
      act.lng += Math.cos(angle) * offset;
    } else {
      coordMap[key] = 0;
    }
  }

  return activities;
}

export async function fetchSpreadsheetData(
  sheetId: string = DEFAULT_SHEET_ID,
  accessToken?: string | null
): Promise<{ users: TeamUser[]; activities: TeamActivity[]; isDemoData: boolean; error?: string }> {
  try {
    let usersRows: string[][] = [];
    let activityRows: string[][] = [];
    let fetchedViaApi = false;

    // Method 1: Google Sheets API v4 with Bearer OAuth Token
    if (accessToken) {
      try {
        const usersRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A1:O1000`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const activityRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Activity!A1:Z1000`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (usersRes.ok && activityRes.ok) {
          const usersData = await usersRes.json();
          const activityData = await activityRes.json();
          usersRows = usersData.values || [];
          activityRows = activityData.values || [];
          fetchedViaApi = true;
        }
      } catch (err) {
        console.warn('Gagal memuat via Sheets API v4 Bearer Token, mencoba CSV export...', err);
      }
    }

    // Method 2: Google Sheets Public GViz CSV Export
    if (!fetchedViaApi) {
      try {
        const [usersCsvRes, activityCsvRes] = await Promise.all([
          fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Users`),
          fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Activity`),
        ]);

        if (usersCsvRes.ok && activityCsvRes.ok) {
          const usersCsvText = await usersCsvRes.text();
          const activityCsvText = await activityCsvRes.text();

          // Ensure it's valid CSV and not HTML login page
          if (!usersCsvText.includes('<!DOCTYPE html>') && !activityCsvText.includes('<!DOCTYPE html>')) {
            usersRows = parseCSV(usersCsvText);
            activityRows = parseCSV(activityCsvText);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat via GViz CSV, menggunakan data sampel...', err);
      }
    }

    const parsedUsers = parseUsersRows(usersRows);
    const parsedActivities = parseActivityRows(activityRows, parsedUsers.length > 0 ? parsedUsers : SAMPLE_USERS);

    if (parsedUsers.length > 0 || parsedActivities.length > 0) {
      return {
        users: parsedUsers.length > 0 ? parsedUsers : SAMPLE_USERS,
        activities: parsedActivities.length > 0 ? parsedActivities : SAMPLE_ACTIVITIES,
        isDemoData: false,
      };
    }

    // If sheet is empty or inaccessible, return rich sample data
    return {
      users: SAMPLE_USERS,
      activities: SAMPLE_ACTIVITIES,
      isDemoData: true,
      error: 'Google Sheet tidak dapat diakses publik atau belum terisi. Menampilkan data simulasi tim.',
    };
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    return {
      users: SAMPLE_USERS,
      activities: SAMPLE_ACTIVITIES,
      isDemoData: true,
      error: error?.message || 'Gagal terhubung ke Google Sheet. Menampilkan data sampel.',
    };
  }
}
