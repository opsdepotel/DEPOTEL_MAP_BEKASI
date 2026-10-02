import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TeamActivity, TeamUser, ActivityFilter } from '../types';
import { formatHmsTime, parseActivityTimestamp } from '../services/googleSheets';
import { formatCoordinate, getAddressFromCoords, getCoordKey, getFallbackAddress } from '../services/reverseGeocode';
import { getUserInitials } from '../utils/user';
import {
  UserCheck,
  MapPin,
  Clock,
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  Navigation,
} from 'lucide-react';

interface CheckinUserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: TeamActivity[];
  users: TeamUser[];
  filter: ActivityFilter;
  onSelectActivity?: (activity: TeamActivity) => void;
}

interface CheckinRowData {
  no: number;
  activity: TeamActivity;
  user?: TeamUser;
  userName: string;
  timeHms: string;
  timestamp: number;
  status: string;
  coordinateStr: string;
  lat: number;
  lng: number;
}

export const CheckinUserListModal: React.FC<CheckinUserListModalProps> = ({
  isOpen,
  onClose,
  activities,
  users,
  filter,
  onSelectActivity,
}) => {
  // Search query inside the modal
  const [modalSearch, setModalSearch] = useState('');
  // Sort direction: 'time_asc' (earliest first), 'time_desc' (latest first), 'name_asc'
  const [sortOrder, setSortOrder] = useState<'time_asc' | 'time_desc' | 'name_asc'>('time_asc');
  // Copy state feedback
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  // Address map state: key -> address string
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});
  // Loading status of reverse geocoding
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Filter activities that match CHECKIN status (based on status, category, siteId, or title)
  const checkinActivities = useMemo(() => {
    return activities.filter(act => {
      const isCheckin =
        (act.status && act.status.toUpperCase() === 'CHECKIN') ||
        (act.category && act.category.toUpperCase().includes('CHECKIN')) ||
        (act.siteId && act.siteId.toUpperCase() === 'CHECKIN') ||
        (act.title && act.title.toUpperCase().includes('CHECKIN'));
      return isCheckin;
    });
  }, [activities]);

  // Map activities to row items with time format hh:mm:ss, coordinates, and user reference
  const checkinRows = useMemo<CheckinRowData[]>(() => {
    // Deduplicate if needed by user on the same date/time or keep all check-in entries
    const rows = checkinActivities.map(act => {
      const matchedUser = users.find(u => {
        if (act.userEmail && u.email) {
          return u.email.trim().toLowerCase() === act.userEmail.trim().toLowerCase();
        }
        if (act.userId && u.id) {
          return u.id.trim().toLowerCase() === act.userId.trim().toLowerCase();
        }
        return u.name.trim().toLowerCase() === act.userName.trim().toLowerCase();
      });

      const timeHms = formatHmsTime(act.time, act.date);
      const timestamp = parseActivityTimestamp(act.date, act.time);
      const coordinateStr = formatCoordinate(act.lat, act.lng);

      return {
        no: 0, // Will be set after sorting
        activity: act,
        user: matchedUser,
        userName: act.userName || matchedUser?.name || 'Petugas Lapangan',
        timeHms,
        timestamp,
        status: 'CHECKIN',
        coordinateStr,
        lat: act.lat,
        lng: act.lng,
      };
    });

    // Apply sorting
    rows.sort((a, b) => {
      if (sortOrder === 'time_asc') {
        return a.timestamp - b.timestamp;
      }
      if (sortOrder === 'time_desc') {
        return b.timestamp - a.timestamp;
      }
      return a.userName.localeCompare(b.userName);
    });

    // Filter by modal search query
    const filtered = rows.filter(r => {
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      const addr = addressMap[getCoordKey(r.lat, r.lng)] || '';
      return (
        r.userName.toLowerCase().includes(q) ||
        r.timeHms.toLowerCase().includes(q) ||
        r.coordinateStr.toLowerCase().includes(q) ||
        addr.toLowerCase().includes(q) ||
        (r.user?.subDivision && r.user.subDivision.toLowerCase().includes(q)) ||
        (r.user?.cluster && r.user.cluster.toLowerCase().includes(q))
      );
    });

    // Assign sequential No (1, 2, 3...)
    return filtered.map((r, index) => ({
      ...r,
      no: index + 1,
    }));
  }, [checkinActivities, users, sortOrder, modalSearch, addressMap]);

  // Load and progressively resolve addresses for all coordinates in the list
  const resolveAllAddresses = useCallback(
    async (forceRefresh = false) => {
      if (checkinRows.length === 0) return;

      setIsLoadingAddresses(true);

      // 1. Initial pass: immediately assign instant fallback / cached address
      const initialMap: Record<string, string> = {};
      for (const row of checkinRows) {
        const key = getCoordKey(row.lat, row.lng);
        // Check cache or fast regional fallback
        const existing = addressMap[key];
        if (existing && !forceRefresh) {
          initialMap[key] = existing;
        } else {
          initialMap[key] = getFallbackAddress(row.lat, row.lng);
        }
      }
      setAddressMap(prev => ({ ...prev, ...initialMap }));

      // 2. Background pass: query Nominatim / BigDataCloud in batches with throttling
      const uniqueCoords = new Map<string, { lat: number; lng: number }>();
      checkinRows.forEach(r => {
        const key = getCoordKey(r.lat, r.lng);
        if (!uniqueCoords.has(key)) {
          uniqueCoords.set(key, { lat: r.lat, lng: r.lng });
        }
      });

      const coordsArray = Array.from(uniqueCoords.values());
      const BATCH_SIZE = 4;

      for (let i = 0; i < coordsArray.length; i += BATCH_SIZE) {
        const batch = coordsArray.slice(i, i + BATCH_SIZE);
        const resolvedBatch = await Promise.all(
          batch.map(async ({ lat, lng }) => {
            const addr = await getAddressFromCoords(lat, lng, forceRefresh);
            return { key: getCoordKey(lat, lng), addr };
          })
        );

        setAddressMap(prev => {
          const updated = { ...prev };
          resolvedBatch.forEach(({ key, addr }) => {
            if (addr) updated[key] = addr;
          });
          return updated;
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < coordsArray.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      setIsLoadingAddresses(false);
    },
    [checkinRows, addressMap]
  );

  // Trigger address resolution whenever modal opens or activities change
  useEffect(() => {
    if (isOpen && checkinActivities.length > 0) {
      resolveAllAddresses(false);
    }
  }, [isOpen, checkinActivities.length]);

  // Copy single coordinate or row to clipboard
  const handleCopyRow = (row: CheckinRowData, index: number) => {
    const addr = addressMap[getCoordKey(row.lat, row.lng)] || getFallbackAddress(row.lat, row.lng);
    const text = `${row.no}\t${row.timeHms}\t${row.userName}\t${row.status}\t${row.coordinateStr}\t${addr}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Copy whole table to clipboard as TSV
  const handleCopyTable = () => {
    const headers = ['No', 'Time', 'User Name', 'Status', 'Koordinat', 'Alamat'].join('\t');
    const lines = checkinRows.map(row => {
      const addr = addressMap[getCoordKey(row.lat, row.lng)] || getFallbackAddress(row.lat, row.lng);
      return `${row.no}\t${row.timeHms}\t${row.userName}\t${row.status}\t${row.coordinateStr}\t"${addr.replace(/"/g, '""')}"`;
    });
    navigator.clipboard.writeText([headers, ...lines].join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Export to CSV file
  const handleExportCsv = () => {
    const headers = ['No', 'Time (hh:mm:ss)', 'User Name', 'Status', 'Koordinat', 'Alamat'];
    const rows = checkinRows.map(row => {
      const addr = addressMap[getCoordKey(row.lat, row.lng)] || getFallbackAddress(row.lat, row.lng);
      return [
        row.no,
        `"${row.timeHms}"`,
        `"${row.userName.replace(/"/g, '""')}"`,
        `"${row.status}"`,
        `"${row.coordinateStr}"`,
        `"${addr.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = filter.selectedDate && filter.selectedDate !== 'ALL' ? filter.selectedDate : 'semua-tanggal';
    link.href = url;
    link.setAttribute('download', `Daftar_User_CHECKIN_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Form Daftar User CHECK-IN
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-emerald-950 shadow-xs">
                  {checkinRows.length} User
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Daftar personil dengan status CHECKIN beserta waktu (hh:mm:ss), koordinat, dan alamat lokasi
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => resolveAllAddresses(true)}
              disabled={isLoadingAddresses}
              title="Sinkronkan & muat ulang data alamat dari koordinat"
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAddresses ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Perbarui Alamat</span>
            </button>

            <button
              onClick={handleCopyTable}
              title="Salin seluruh isi tabel ke clipboard"
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedAll ? 'Tersalin' : 'Salin Tabel'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              title="Unduh data dalam format CSV / Excel"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition ml-1"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Summary & Search Controls */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Active Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter Aktif:
            </span>

            {/* Date Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
              <Calendar className="w-3 h-3 text-blue-600" />
              {filter.selectedDate && filter.selectedDate !== 'ALL' ? filter.selectedDate : 'Semua Tanggal'}
            </span>

            {/* Division Pill */}
            {filter.division && filter.division !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                Divisi: {filter.division}
              </span>
            )}

            {/* Sub Division Pill */}
            {filter.subDivision && filter.subDivision !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold">
                Sub Divisi: {filter.subDivision}
              </span>
            )}

            {/* Cluster Pill */}
            {filter.cluster && filter.cluster !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                Cluster: {filter.cluster}
              </span>
            )}

            {/* Address Resolution Indicator */}
            {isLoadingAddresses && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Mengambil data alamat koordinat...
              </span>
            )}
          </div>

          {/* Quick Search & Sort Control */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, waktu, alamat..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
              {modalSearch && (
                <button
                  onClick={() => setModalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (sortOrder === 'time_asc') setSortOrder('time_desc');
                else if (sortOrder === 'time_desc') setSortOrder('name_asc');
                else setSortOrder('time_asc');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs transition"
              title="Ganti Urutan"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {sortOrder === 'time_asc' && 'Waktu (Awal → Akhir)'}
                {sortOrder === 'time_desc' && 'Waktu (Akhir → Awal)'}
                {sortOrder === 'name_asc' && 'Nama (A - Z)'}
              </span>
            </button>
          </div>

        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-auto p-0 bg-white">
          {checkinRows.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Tidak ada data User Check-in</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Tidak ditemukan personil berstatus CHECKIN pada filter tanggal{' '}
                <span className="font-semibold text-slate-700">{filter.selectedDate}</span> atau kata kunci pencarian ini.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
                  <th className="py-3 px-3 w-14 text-center">No</th>
                  <th className="py-3 px-3 w-32 whitespace-nowrap">Time (hh:mm:ss)</th>
                  <th className="py-3 px-4 min-w-[200px]">User Name</th>
                  <th className="py-3 px-3 w-28 text-center">Status</th>
                  <th className="py-3 px-3 min-w-[170px]">Koordinat</th>
                  <th className="py-3 px-4 min-w-[280px]">Alamat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {checkinRows.map((row, index) => {
                  const key = getCoordKey(row.lat, row.lng);
                  const address = addressMap[key] || getFallbackAddress(row.lat, row.lng);
                  const isCopied = copiedIndex === index;

                  return (
                    <tr
                      key={row.activity.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* 1. Kolom: No */}
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-700 font-mono text-xs transition">
                          {row.no}
                        </span>
                      </td>

                      {/* 2. Kolom: Time (Format hh:mm:ss) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 group-hover:bg-white border border-slate-200 font-mono font-bold text-slate-800 text-[12px] shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{row.timeHms}</span>
                        </div>
                      </td>

                      {/* 3. Kolom: User Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-2xs shrink-0"
                            style={{
                              backgroundColor: row.user?.color || '#3B82F6',
                            }}
                          >
                            {getUserInitials(row.userName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {row.userName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                              {row.user?.subDivision && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold">
                                  {row.user.subDivision}
                                </span>
                              )}
                              {row.user?.cluster && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
                                  {row.user.cluster}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Kolom: Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          CHECKIN
                        </span>
                      </td>

                      {/* 5. Kolom: Koordinat */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 text-[11px] font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {row.coordinateStr}
                          </span>
                          
                          {/* Quick Map & Google Maps Links */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            {onSelectActivity && (
                              <button
                                onClick={() => {
                                  onSelectActivity(row.activity);
                                  onClose();
                                }}
                                title="Fokuskan titik ini pada peta"
                                className="p-1 rounded hover:bg-blue-100 text-blue-600 transition"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka titik koordinat di Google Maps"
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* 6. Kolom: Alamat (Data yang diambil dari koordinat) */}
                      <td className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 text-slate-700 leading-relaxed text-[11px] max-w-xl">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="font-normal selection:bg-blue-200">
                              {address}
                            </span>
                          </div>

                          {/* Copy Row Button */}
                          <button
                            onClick={() => handleCopyRow(row, index)}
                            title="Salin baris ini"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Total Baris: <b className="text-slate-900 font-bold">{checkinRows.length}</b> User Check-in
            </span>
            {checkinRows.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span>
                  Check-in Pertama: <b className="font-mono font-bold text-blue-700">{checkinRows[0].timeHms}</b> ({checkinRows[0].userName})
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Check-in Terakhir:{' '}
                  <b className="font-mono font-bold text-indigo-700">
                    {checkinRows[checkinRows.length - 1].timeHms}
                  </b>{' '}
                  ({checkinRows[checkinRows.length - 1].userName})
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
