import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { SheetFetchState } from '../types';
import { DepotelLogo } from './DepotelLogo';

interface NavbarProps {
  user: FirebaseUser | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  fetchState: SheetFetchState;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  activeCluster?: string;
  checkinCount?: number;
  onOpenCheckinModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  fetchState,
  onRefresh,
  onOpenAddModal,
  activeCluster,
  checkinCount = 0,
  onOpenCheckinModal,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-950 via-slate-950 to-black text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-tight">
                  Peta Lokasi Kegiatan Operasional
                </h1>
                {activeCluster && activeCluster !== 'ALL' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                    {activeCluster.charAt(0).toUpperCase() + activeCluster.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Monitoring kegiatan harian team
              </p>
            </div>
          </div>

          {/* Center Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center z-10">
            <DepotelLogo height={28} />
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3 z-10">
            
            {/* Sync Status Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-semibold select-none"
            >
              {fetchState.loading ? (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memuat...</span>
                </span>
              ) : fetchState.isDemoData ? (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Simulasi</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terhubung</span>
                </span>
              )}
            </div>

            {/* Form / Daftar User Check-in Button */}
            {onOpenCheckinModal && (
              <button
                onClick={onOpenCheckinModal}
                title="Buka Form Daftar User berstatus CHECKIN"
                className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-500/50 shadow-sm transition hover:shadow-emerald-500/20"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-100" />
                <span className="hidden sm:inline">Daftar Check-in</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-400/40">
                  {checkinCount}
                </span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={fetchState.loading}
              title="Muat ulang data dari Google Sheet"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition hover:text-white disabled:opacity-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchState.loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
