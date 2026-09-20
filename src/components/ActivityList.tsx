import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TeamActivity, TeamUser, ActivityFilter } from '../types';
import { formatWaktuDisplay, getSiteDisplay } from '../services/googleSheets';
import { getUserInitials } from '../utils/user';
import {
  Search,
  Calendar,
  MapPin,
  Tag,
  ListFilter,
  Camera,
  Maximize2,
  Users,
  ChevronDown,
  ChevronUp,
  Activity,
  FileCheck,
  Clock,
  X,
} from 'lucide-react';

interface ActivityListProps {
  activities: TeamActivity[];
  users: TeamUser[];
  filter: ActivityFilter;
  onFilterChange: (newFilter: ActivityFilter) => void;
  selectedActivity: TeamActivity | null;
  onSelectActivity: (activity: TeamActivity) => void;
  onViewPhoto?: (activity: TeamActivity) => void;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  showTrail: boolean;
  onToggleTrail: () => void;
}

interface ActiveUserGroup {
  user: TeamUser | null;
  userId: string;
  userName: string;
  subDivision?: string;
  activitiesCount: number;
  userActivities: TeamActivity[];
  latestActivity: TeamActivity | null;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  users,
  filter,
  onFilterChange,
  selectedActivity,
  onSelectActivity,
  onViewPhoto,
  selectedUserId,
  onSelectUser,
  showTrail,
  onToggleTrail,
}) => {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto scroll item into view when selectedActivity changes
  useEffect(() => {
    if (selectedActivity && itemRefs.current[selectedActivity.id]) {
      itemRefs.current[selectedActivity.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedActivity]);

  const getUserColor = (userId: string, userName?: string) => {
    const u = users.find(
      user => user.id === userId || (userName && user.name.toLowerCase() === userName.toLowerCase())
    );
    if (u?.color) return u.color;

    const palette = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#4F46E5'];
    const key = userName || userId || 'default';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const getUserAvatar = (userId: string) => {
    const u = users.find(user => user.id === userId);
    return u?.avatar;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Group activities by user to construct Active Users List & Activity Counts
  const userGroups = useMemo(() => {
    const map = new Map<string, { user: TeamUser | null; userName: string; acts: TeamActivity[] }>();

    activities.forEach(act => {
      const matchedUser = users.find(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uId = u.id.trim().toLowerCase();
        const uName = u.name.trim().toLowerCase();
        const actEmail = (act.userEmail || '').trim().toLowerCase();
        const actUserId = (act.userId || '').trim().toLowerCase();
        const actUserName = (act.userName || '').trim().toLowerCase();

        if (actEmail && uEmail && actEmail === uEmail) return true;
        if (actUserId && (uId === actUserId || uEmail === actUserId || actUserId.includes(uEmail))) return true;
        if (actUserName && (uName === actUserName || uName.includes(actUserName) || actUserName.includes(uName))) return true;
        return false;
      });

      const groupKey = matchedUser ? matchedUser.id : (act.userId || act.userName.toLowerCase());
      const displayName = matchedUser ? matchedUser.name : act.userName;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          user: matchedUser || null,
          userName: displayName,
          acts: [],
        });
      }
      map.get(groupKey)!.acts.push(act);
    });

    // Also include users from `users` list who might have 0 activities matching the filter
    users.forEach(u => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          user: u,
          userName: u.name,
          acts: [],
        });
      }
    });

    const groups: ActiveUserGroup[] = [];

    map.forEach((value, groupKey) => {
      const sortedActs = [...value.acts].sort((a, b) => {
        const timeA = `${a.date || ''} ${a.time || ''}`;
        const timeB = `${b.date || ''} ${b.time || ''}`;
        return timeB.localeCompare(timeA);
      });

      groups.push({
        user: value.user,
        userId: groupKey,
        userName: value.userName,
        subDivision: value.user?.subDivision || value.user?.team || sortedActs[0]?.userSubDivision || sortedActs[0]?.userTeam,
        activitiesCount: sortedActs.length,
        userActivities: sortedActs,
        latestActivity: sortedActs[0] || null,
      });
    });

    // Sort: Active users (>0 activities) first by count descending, then inactive users
    return groups.sort((a, b) => {
      if (b.activitiesCount !== a.activitiesCount) {
        return b.activitiesCount - a.activitiesCount;
      }
      return a.userName.localeCompare(b.userName);
    });
  }, [activities, users]);

  const activeUsers = useMemo(() => userGroups.filter(g => g.activitiesCount > 0), [userGroups]);

  const toggleUserExpand = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const selectedUserObj = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-4">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
        
        {/* Top Row: Search & Trail Button */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pengguna, kegiatan, lokasi..."
              value={filter.searchQuery}
              onChange={e => onFilterChange({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Toggle Trail Button */}
          <button
            onClick={onToggleTrail}
            title="Tampilkan garis rute pergerakan kronologis"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 cursor-pointer ${
              showTrail
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Rute Jalur</span>
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Tanggal:</span>
            <input
              type="date"
              value={filter.selectedDate === 'ALL' ? '' : filter.selectedDate}
              onChange={e =>
                onFilterChange({
                  ...filter,
                  selectedDate: e.target.value ? e.target.value : 'ALL',
                })
              }
              className="px-2 py-1 text-xs font-semibold bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onFilterChange({ ...filter, selectedDate: todayStr })}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                filter.selectedDate === todayStr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => onFilterChange({ ...filter, selectedDate: 'ALL' })}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                filter.selectedDate === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua Tanggal
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Sub Divisi Filter Dropdown (Kolom H: MR, CM, MBP) */}
          <select
            value={filter.subDivision || 'ALL'}
            onChange={e => onFilterChange({ ...filter, subDivision: e.target.value })}
            className="px-2.5 py-1.5 text-xs bg-blue-50/90 rounded-lg border border-blue-200 text-blue-900 font-bold focus:outline-none focus:border-blue-500 shrink-0 cursor-pointer"
          >
            <option value="ALL">Semua Sub Divisi</option>
            <option value="MR">Sub Divisi MR</option>
            <option value="CM">Sub Divisi CM</option>
            <option value="MBP">Sub Divisi MBP</option>
            {Array.from(new Set(users.map(u => u.subDivision).filter((sd): sd is string => Boolean(sd))))
              .filter(sd => {
                const s = sd.trim().toLowerCase();
                return s && !['all', 'mr', 'cm', 'mbp', '-', '—', '–', 'none', 'null'].includes(s) && s.replace(/[-_.\s]/g, '') !== '';
              })
              .map(sd => (
                <option key={sd} value={sd}>
                  Sub Divisi {sd}
                </option>
              ))}
          </select>
        </div>

      </div>

      {/* Active Users Summary Banner */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 flex-wrap">
          <Users className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Pengguna Aktif</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[11px]">
            {activeUsers.length} Orang
          </span>
          <span className="text-slate-400">•</span>
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-600" />
            {activities.length} Aktifitas
          </span>
        </div>

        {/* If a specific user is selected on map, show clear filter button */}
        {selectedUserId !== 'ALL' && (
          <button
            onClick={() => onSelectUser('ALL')}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-2xs cursor-pointer shrink-0"
            title="Reset Pilihan User di Peta"
          >
            <span>Semua Peta</span>
            <X className="w-3 h-3 text-slate-500" />
          </button>
        )}
      </div>

      {/* Active Users List */}
      <div 
        id="active-users-scroll-container"
        tabIndex={0}
        aria-label="Daftar Pengguna Aktif"
        className="flex flex-col gap-2.5 max-h-[460px] sm:max-h-[500px] lg:max-h-[520px] overflow-y-auto overscroll-contain custom-scrollbar pr-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded-xl"
      >
        {activeUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <ListFilter className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-medium">Tidak ada pengguna aktif pada filter ini.</p>
          </div>
        ) : (
          activeUsers.map(group => {
            const isUserSelected =
              selectedUserId === group.userId ||
              (selectedUserObj && selectedUserObj.name.toLowerCase() === group.userName.toLowerCase());
            const isExpanded = expandedUsers[group.userId];
            const color = getUserColor(group.userId, group.userName);
            const avatar = getUserAvatar(group.userId);
            const initial = getUserInitials(group.userName);
            const cleanSubDivision = group.subDivision
              ? group.subDivision.replace(/^(sub\s*divisi\s*|subdivisi\s*)/i, '').trim()
              : '';

            return (
              <div
                key={group.userId}
                className={`group rounded-xl border transition flex flex-col overflow-hidden shrink-0 ${
                  isUserSelected
                    ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                {/* Main User Card Header (Clickable to highlight on map) */}
                <div
                  onClick={() => onSelectUser(isUserSelected ? 'ALL' : group.userId)}
                  className="p-3.5 flex items-start justify-between gap-3 cursor-pointer min-h-[72px]"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* User Avatar (Icon Pengguna - tetap) */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 text-white uppercase shadow-2xs mt-0.5 ${
                        initial.length > 1 ? 'text-[11px] font-extrabold tracking-tight' : 'text-xs font-bold'
                      }`}
                      style={{ backgroundColor: color, borderColor: color }}
                    >
                      {avatar ? (
                        <img src={avatar} alt={group.userName} className="w-full h-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Nama Pengguna (tetap) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition">
                          {group.userName}
                        </span>
                        {isUserSelected && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                            Dipilih di Peta
                          </span>
                        )}
                      </div>

                      {/* Baris Sub Divisi & Tombol Rincian (sejajar horizontal, Rincian rata kanan) */}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {cleanSubDivision ? (
                          <span className="inline-block bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-semibold whitespace-nowrap border border-slate-200/70">
                            {cleanSubDivision}
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={(e) => toggleUserExpand(group.userId, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-md transition cursor-pointer border border-slate-200/80 hover:border-blue-200 shrink-0"
                          title="Lihat rincian kegiatan pengguna ini"
                        >
                          <span>{isExpanded ? 'Tutup' : 'Rincian'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Badge Jumlah Aktifitas di bawah label Sub Divisi */}
                      <div className="mt-1.5 flex items-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{group.activitiesCount} Aktifitas</span>
                        </span>
                      </div>

                      {/* Latest Activity Brief: Site ID / Lokasi Terakhir & Waktu Terakhir Laporan */}
                      {group.latestActivity && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
                          {/* Label Site ID / Lokasi Terakhir */}
                          <div className="flex items-center gap-1.5 min-w-0" title={`Site / Lokasi: ${getSiteDisplay(group.latestActivity)}`}>
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {getSiteDisplay(group.latestActivity)}
                            </span>
                          </div>

                          {/* Waktu Terakhir Laporan di bawah label Site */}
                          <div className="flex items-center gap-1.5 text-slate-500 pl-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[10.5px] font-medium text-slate-600 truncate">
                              {formatWaktuDisplay(group.latestActivity.date, group.latestActivity.time)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Activity Sub-List */}
                {isExpanded && (
                  <div className="bg-slate-50/80 border-t border-slate-200/80 p-2.5 flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar overscroll-contain">
                    <div className="text-[11px] font-bold text-slate-500 px-1 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-slate-50/95 py-0.5 z-10 backdrop-blur-xs">
                      <span>Daftar Laporan ({group.userActivities.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Klik untuk pilih di peta</span>
                    </div>

                    {group.userActivities.map(act => {
                      const isActSelected = selectedActivity?.id === act.id;

                      return (
                        <div
                          key={act.id}
                          ref={el => {
                            itemRefs.current[act.id] = el;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectActivity(act);
                          }}
                          className={`p-2.5 rounded-lg border text-xs transition cursor-pointer flex flex-col gap-1.5 ${
                            isActSelected
                              ? 'bg-blue-100/80 border-blue-400 shadow-2xs ring-1 ring-blue-400'
                              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">{act.title}</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {formatWaktuDisplay(act.date, act.time)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{getSiteDisplay(act)}</span>
                          </div>

                          {act.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                              {act.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                              <Tag className="w-3 h-3 text-slate-400" />
                              {act.category}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewPhoto) onViewPhoto(act);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded transition cursor-pointer"
                            >
                              <Camera className="w-3 h-3 text-indigo-600" />
                              <span>Foto</span>
                              <Maximize2 className="w-2.5 h-2.5 text-indigo-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
