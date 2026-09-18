import React from 'react';
import { TeamActivity, TeamUser } from '../types';
import {
  Activity,
  Users
} from 'lucide-react';

interface StatsOverviewProps {
  activities: TeamActivity[];
  users: TeamUser[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ activities, users }) => {
  const total = activities.length;
  
  const activeUserIds = new Set(activities.map(a => a.userId));
  const activeUsersCount = activeUserIds.size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
      
      {/* Jumlah Aktifitas Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500 tracking-wide">Jumlah Aktifitas</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{total}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* Personel Aktif Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500 tracking-wide">Personel Aktif</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {activeUsersCount} <span className="text-xs font-normal text-slate-400">/ {users.length}</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
