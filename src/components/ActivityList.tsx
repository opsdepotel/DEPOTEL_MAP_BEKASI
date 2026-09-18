import React, { useRef, useEffect } from 'react';
import { TeamActivity, TeamUser, ActivityFilter } from '../types';
import { formatWaktuDisplay, getSiteDisplay } from '../services/googleSheets';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ExternalLink,
  ListFilter
} from 'lucide-react';

interface ActivityListProps {
  activities: TeamActivity[];
  users: TeamUser[];
  filter: ActivityFilter;
  onFilterChange: (newFilter: ActivityFilter) => void;
  selectedActivity: TeamActivity | null;
  onSelectActivity: (activity: TeamActivity) => void;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  showTrail: boolean;
  onToggleTrail: () => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  users,
  filter,
  onFilterChange,
  selectedActivity,
  onSelectActivity,
  selectedUserId,
  onSelectUser,
  showTrail,
  onToggleTrail,
}) => {
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto scroll item into view when selectedActivity changes (e.g. from map marker click)
  useEffect(() => {
    if (selectedActivity && itemRefs.current[selectedActivity.id]) {
      itemRefs.current[selectedActivity.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedActivity]);

  // Extract unique categories for filter dropdowns
  const categories = Array.from(new Set(activities.map(a => a.category).filter(Boolean)));

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
              placeholder="Cari kegiatan, nama tim, atau lokasi..."
              value={filter.searchQuery}
              onChange={e => onFilterChange({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Toggle Trail Button */}
          <button
            onClick={onToggleTrail}
            title="Tampilkan garis rute pergerakan kronologis"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 ${
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
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                filter.selectedDate === todayStr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => onFilterChange({ ...filter, selectedDate: 'ALL' })}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
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
            className="px-2.5 py-1.5 text-xs bg-blue-50/90 rounded-lg border border-blue-200 text-blue-900 font-bold focus:outline-none focus:border-blue-500 shrink-0"
          >
            <option value="ALL">Semua Sub Divisi</option>
            <option value="MR">Sub Divisi MR</option>
            <option value="CM">Sub Divisi CM</option>
            <option value="MBP">Sub Divisi MBP</option>
            {Array.from(new Set(users.map(u => u.subDivision).filter(Boolean)))
              .filter(sd => sd && !['all', 'mr', 'cm', 'mbp'].includes(sd.toString().toLowerCase()))
              .map(sd => (
                <option key={sd} value={sd}>
                  Sub Divisi {sd}
                </option>
              ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={filter.category}
            onChange={e => onFilterChange({ ...filter, category: e.target.value })}
            className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* Activity Items Feed */}
      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <ListFilter className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-medium">Tidak ada kegiatan yang sesuai filter.</p>
          </div>
        ) : (
          activities.map(act => {
            const isSelected = selectedActivity?.id === act.id;
            const color = getUserColor(act.userId, act.userName);
            const avatar = getUserAvatar(act.userId);
            const initial = (act.userName && act.userName.trim().length > 0)
              ? act.userName.trim()[0].toUpperCase()
              : 'U';

            return (
              <div
                key={act.id}
                ref={el => {
                  itemRefs.current[act.id] = el;
                }}
                onClick={() => onSelectActivity(act)}
                className={`group p-3 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* User Info */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border shrink-0 text-[10px] font-bold text-white uppercase"
                    style={{ backgroundColor: color, borderColor: color }}
                  >
                    {avatar ? (
                      <img src={avatar} alt={act.userName} className="w-full h-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <span className="font-bold text-xs text-slate-900 truncate">{act.userName}</span>
                </div>

                {/* Date & Time below user name, left-aligned */}
                <div className="flex items-center gap-1.5 self-start">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatWaktuDisplay(act.date, act.time)}
                  </span>
                </div>

                {/* Activity Title */}
                <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                  {act.title}
                </div>

                {/* Location */}
                <div className="flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{getSiteDisplay(act)}</span>
                </div>

                {/* Description snippet if any */}
                {act.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                    {act.description}
                  </p>
                )}

                {/* Footer Tag */}
                <div className="flex items-center text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {act.category}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
