import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutUser,
  getAccessToken
} from './services/firebaseAuth';
import {
  fetchSpreadsheetData,
  DEFAULT_SHEET_ID
} from './services/googleSheets';
import { TeamUser, TeamActivity, SheetFetchState, ActivityFilter } from './types';

import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { ActivityList } from './components/ActivityList';
import { AddActivityModal } from './components/AddActivityModal';
import { ActivityDetailModal } from './components/ActivityDetailModal';

import { MapPin, AlertCircle, RefreshCw, FileSpreadsheet, PlusCircle } from 'lucide-react';

// Extract initial cluster from URL (pathname e.g. /bekasi, /southern or query param ?cluster=bekasi)
export function getClusterFromUrl(): string {
  if (typeof window === 'undefined') return 'ALL';

  // 1. Check query parameter: ?cluster=...
  const searchParams = new URLSearchParams(window.location.search);
  const clusterQuery = searchParams.get('cluster');
  if (clusterQuery && clusterQuery.trim()) {
    return clusterQuery.trim();
  }

  // 2. Check path slug: /bekasi, /southern, etc.
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
  if (pathname && !pathname.includes('.') && pathname.toLowerCase() !== 'index.html') {
    return decodeURIComponent(pathname);
  }

  return 'ALL';
}

export default function App() {
  // Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Quota Exceeded State
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Data States
  const [sheetId, setSheetId] = useState<string>(DEFAULT_SHEET_ID);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [fetchState, setFetchState] = useState<SheetFetchState>({
    loading: true,
    error: null,
    lastFetched: null,
    sheetId: DEFAULT_SHEET_ID,
    usersCount: 0,
    activitiesCount: 0,
  });

  // UI Selection & Filter States
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<TeamActivity | null>(null);
  const [showTrail, setShowTrail] = useState<boolean>(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const [filter, setFilter] = useState<ActivityFilter>(() => ({
    searchQuery: '',
    userId: 'ALL',
    selectedDate: todayStr,
    category: 'ALL',
    status: 'ALL',
    division: 'ALL',
    subDivision: 'ALL',
    cluster: getClusterFromUrl(),
  }));

  // Sync cluster filter if browser navigation (Back/Forward) changes URL
  useEffect(() => {
    const handleLocationChange = () => {
      const urlCluster = getClusterFromUrl();
      setFilter(prev => {
        if (prev.cluster.toLowerCase() !== urlCluster.toLowerCase()) {
          return { ...prev, cluster: urlCluster };
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Update filter
  const handleFilterChange = useCallback((newFilter: ActivityFilter) => {
    setFilter(newFilter);
  }, []);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [photoModalActivity, setPhotoModalActivity] = useState<TeamActivity | null>(null);

  // Quota Event Listener
  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Fetch Spreadsheet Data
  const loadData = useCallback(
    async (targetSheetId: string, accessToken?: string | null) => {
      setFetchState(prev => ({ ...prev, loading: true, error: null }));
      const result = await fetchSpreadsheetData(targetSheetId, accessToken);

      setUsers(result.users);
      setActivities(result.activities);
      setFetchState({
        loading: false,
        error: result.error || null,
        lastFetched: new Date(),
        sheetId: targetSheetId,
        usersCount: result.users.length,
        activitiesCount: result.activities.length,
        isDemoData: result.isDemoData,
      });
    },
    []
  );

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        loadData(sheetId, accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        loadData(sheetId, null);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadData, sheetId]);

  // Handle Login Click
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        await loadData(sheetId, result.accessToken);
      }
    } catch (err) {
      console.error('Login gagal:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    loadData(sheetId, null);
  };

  // Normalize Sub Divisi strings (e.g. "Sub Divisi MR" -> "mr", "CM" -> "cm")
  const normalizeSubDiv = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/sub\s*divisi/g, '')
      .replace(/subdivisi/g, '')
      .replace(/sub/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Helper to find User for an Activity via Activity.UserEmail <> Users.Email join
  const findUserForActivity = useCallback((act: TeamActivity, userList: TeamUser[]): TeamUser | undefined => {
    const actEmail = (act.userEmail || '').trim().toLowerCase();
    const actUserId = (act.userId || '').trim().toLowerCase();
    const actUserName = (act.userName || '').trim().toLowerCase();

    // 1. Highest Priority: Match by exact email
    if (actEmail) {
      const matchByEmail = userList.find(u => u.email && u.email.trim().toLowerCase() === actEmail);
      if (matchByEmail) return matchByEmail;
    }

    // 2. Second Priority: Match by exact user ID
    if (actUserId) {
      const matchById = userList.find(u => u.id.trim().toLowerCase() === actUserId || (u.email && u.email.trim().toLowerCase() === actUserId));
      if (matchById) return matchById;
    }

    // 3. Third Priority: Match by exact full name (exact equality, not substring includes)
    if (actUserName) {
      const matchByName = userList.find(u => u.name.trim().toLowerCase() === actUserName);
      if (matchByName) return matchByName;
    }

    return undefined;
  }, []);

  // Filter users by Division (Column G), Sub Division (Column H), and Cluster (Column O)
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Cluster Filter (Column O)
      if (filter.cluster && filter.cluster !== 'ALL') {
        const targetCluster = filter.cluster.trim().toLowerCase();
        const uCluster = (u.cluster || '').trim().toLowerCase();
        if (!uCluster || (!uCluster.includes(targetCluster) && !targetCluster.includes(uCluster))) {
          return false;
        }
      }

      // Division Filter (Column G)
      if (filter.division && filter.division !== 'ALL') {
        const targetDiv = filter.division.trim().toLowerCase();
        const uDiv = (u.division || u.team || '').trim().toLowerCase();
        if (!uDiv.includes(targetDiv) && !targetDiv.includes(uDiv)) {
          return false;
        }
      }

      // Sub Division Filter (Column H - e.g. MR, CM, MBP)
      if (filter.subDivision && filter.subDivision !== 'ALL') {
        const targetNorm = normalizeSubDiv(filter.subDivision);
        const userNorm = normalizeSubDiv(u.subDivision || u.team || '');
        if (targetNorm && userNorm) {
          if (targetNorm !== userNorm && !userNorm.includes(targetNorm) && !targetNorm.includes(userNorm)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [users, filter.division, filter.subDivision, filter.cluster]);

  // Base Filtered Activities (Filtered by Date, SubDiv, Category, Search Query, etc. EXCLUDING selectedUserId)
  const baseFilteredActivities = useMemo(() => {
    // Helper to normalize date strings to YYYY-MM-DD
    const normalizeDate = (dStr: string) => {
      if (!dStr) return '';
      const trimmed = dStr.trim();
      const yyyyMatch = trimmed.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
      if (yyyyMatch) {
        return `${yyyyMatch[1]}-${yyyyMatch[2].padStart(2, '0')}-${yyyyMatch[3].padStart(2, '0')}`;
      }
      const ddMatch = trimmed.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
      if (ddMatch) {
        return `${ddMatch[3]}-${ddMatch[2].padStart(2, '0')}-${ddMatch[1].padStart(2, '0')}`;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return trimmed;
    };

    return activities.filter(act => {
      const userObj = findUserForActivity(act, users);

      // Cluster Filter: Dynamic based on filter.cluster
      if (filter.cluster && filter.cluster !== 'ALL') {
        const targetCluster = filter.cluster.trim().toLowerCase();
        const joinedCluster = (act.userCluster || userObj?.cluster || '').trim().toLowerCase();
        if (!joinedCluster || (!joinedCluster.includes(targetCluster) && !targetCluster.includes(joinedCluster))) {
          return false;
        }
      }

      // Division Filter (Column G)
      if (filter.division && filter.division !== 'ALL') {
        const targetDiv = filter.division.trim().toLowerCase();
        const userDiv = (userObj?.division || userObj?.team || act.userTeam || '').trim().toLowerCase();

        if (userDiv) {
          if (!userDiv.includes(targetDiv) && !targetDiv.includes(userDiv)) {
            return false;
          }
        } else if (act.userTeam) {
          if (!act.userTeam.trim().toLowerCase().includes(targetDiv)) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Sub Division Filter (Column H - e.g. MR, CM, MBP)
      if (filter.subDivision && filter.subDivision !== 'ALL') {
        const targetNorm = normalizeSubDiv(filter.subDivision);
        const userNorm = normalizeSubDiv(act.userSubDivision || userObj?.subDivision || userObj?.team || act.userTeam || '');

        if (targetNorm && userNorm) {
          if (targetNorm !== userNorm && !userNorm.includes(targetNorm) && !targetNorm.includes(userNorm)) {
            return false;
          }
        } else {
          const actTeamNorm = normalizeSubDiv(act.userTeam || '');
          const titleNorm = normalizeSubDiv(act.title || '');
          const descNorm = normalizeSubDiv(act.description || '');
          if (actTeamNorm !== targetNorm && !titleNorm.includes(targetNorm) && !descNorm.includes(targetNorm)) {
            return false;
          }
        }
      }

      // Date Filter
      if (filter.selectedDate && filter.selectedDate !== 'ALL') {
        const actDate = normalizeDate(act.date);
        const targetDate = normalizeDate(filter.selectedDate);
        if (actDate !== targetDate) {
          return false;
        }
      }

      // Category Filter
      if (filter.category !== 'ALL' && act.category !== filter.category) {
        return false;
      }

      // Status Filter
      if (filter.status !== 'ALL' && act.status !== filter.status) {
        return false;
      }

      // Search Query
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesUser = act.userName.toLowerCase().includes(q);
        const matchesLocation = act.locationName.toLowerCase().includes(q);
        const matchesDesc = act.description.toLowerCase().includes(q);
        return matchesTitle || matchesUser || matchesLocation || matchesDesc;
      }

      return true;
    });
  }, [activities, users, filter, findUserForActivity]);

  // Filtered Activities for Map and Stats (further filtered by selectedUserId)
  const filteredActivities = useMemo(() => {
    if (selectedUserId === 'ALL') return baseFilteredActivities;
    return baseFilteredActivities.filter(act => {
      const userObj = findUserForActivity(act, users);
      const isMatch =
        act.userId === selectedUserId ||
        (userObj && userObj.id === selectedUserId) ||
        (selectedUserId && act.userName.toLowerCase() === selectedUserId.toLowerCase());
      return isMatch;
    });
  }, [baseFilteredActivities, selectedUserId, users, findUserForActivity]);

  // Add new activity
  const handleAddActivity = (newActivity: TeamActivity) => {
    setActivities(prev => [newActivity, ...prev]);
    setSelectedActivity(newActivity);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Quota Exceeded Banner as instructed by Google Maps Skill */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        fetchState={fetchState}
        onRefresh={() => loadData(sheetId, token)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        activeCluster={filter.cluster}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
        
        {/* Banner Alert for Demo Mode / Google Sheet Connectivity */}
        {fetchState.isDemoData && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-amber-950">Mode Simulasi Google Sheet</div>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Web app memetakan data simulasi tim. Untuk menghubungkan secara langsung ke Google Sheet Anda, Anda
                  dapat menekan tombol <b>"Masuk Akun Google"</b> di sebelah kanan.
                </p>
              </div>
            </div>

            {needsAuth && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={handleLogin}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Masuk Akun Google
                </button>
              </div>
            )}
          </div>
        )}



        {/* Main Grid: Map (Left/Top) + Team Sidebar & List (Right/Bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Map Column */}
          <div className="lg:col-span-8 xl:col-span-9 h-[500px] lg:h-[650px] sticky top-20">
            <MapView
              activities={filteredActivities}
              users={filteredUsers}
              selectedActivity={selectedActivity}
              selectedUserId={selectedUserId}
              onSelectActivity={setSelectedActivity}
              onViewPhoto={setPhotoModalActivity}
              showTrail={showTrail}
            />
          </div>

          {/* Side Controls & Activities Column */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
            
            {/* Filterable Active Users & Activity Feed */}
            <ActivityList
              activities={baseFilteredActivities}
              users={filteredUsers}
              filter={filter}
              onFilterChange={handleFilterChange}
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
              onViewPhoto={setPhotoModalActivity}
              selectedUserId={selectedUserId}
              onSelectUser={userId => {
                setSelectedUserId(userId);
                if (userId !== 'ALL') {
                  const targetUser = users.find(u => u.id === userId);
                  const userActs = activities.filter(
                    a =>
                      a.userId === userId ||
                      (targetUser?.email && a.userEmail?.toLowerCase() === targetUser.email.toLowerCase()) ||
                      (targetUser && a.userName.toLowerCase() === targetUser.name.toLowerCase())
                  );
                  if (userActs.length > 0) {
                    // Sort descending by date & time so the latest activity is selected and focused on the map
                    const sorted = [...userActs].sort((a, b) => {
                      const timeA = `${a.date || ''} ${a.time || ''}`;
                      const timeB = `${b.date || ''} ${b.time || ''}`;
                      return timeB.localeCompare(timeA);
                    });
                    setSelectedActivity(sorted[0]);
                  } else {
                    setSelectedActivity(null);
                  }
                } else {
                  setSelectedActivity(null);
                }
              }}
              showTrail={showTrail}
              onToggleTrail={() => setShowTrail(!showTrail)}
            />

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-300">Peta Lokasi Kegiatan Operasional</span>
            <span>— Google Sheets & Leaflet.js</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        users={users}
        onAddActivity={handleAddActivity}
      />

      <ActivityDetailModal
        activity={photoModalActivity}
        isOpen={!!photoModalActivity}
        onClose={() => setPhotoModalActivity(null)}
      />

    </div>
  );
}
