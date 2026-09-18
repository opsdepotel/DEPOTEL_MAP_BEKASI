export interface TeamUser {
  id: string;
  name: string;
  role: string;
  team: string;
  division?: string;
  subDivision?: string;
  cluster?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  color: string;
}

export interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userTeam?: string;
  userRole?: string;
  userDivision?: string;
  userSubDivision?: string;
  userCluster?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp?: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  locationName: string;
  lat: number;
  lng: number;
  category: 'Kunjungan Client' | 'Inspeksi' | 'Meeting' | 'Survei' | 'Lainnya' | string;
  status: 'Selesai' | 'Dalam Proses' | 'Rencana' | string;
  photoUrl?: string;
}

export interface SheetFetchState {
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  sheetId: string;
  usersCount: number;
  activitiesCount: number;
  isDemoData?: boolean;
}

export interface ActivityFilter {
  searchQuery: string;
  userId: string; // 'ALL' or specific ID
  selectedDate: string; // 'ALL' or 'YYYY-MM-DD'
  category: string; // 'ALL' or specific category
  status: string; // 'ALL' or specific status
  division: string; // 'FMS', 'ALL', or specific division
  subDivision: string; // 'ALL', 'MR', 'CM', 'MBP', or specific sub division
  cluster: string; // 'BEKASI', 'ALL', or specific cluster
}
