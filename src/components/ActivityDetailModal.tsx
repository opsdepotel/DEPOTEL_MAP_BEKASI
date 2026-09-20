import React, { useState } from 'react';
import { TeamActivity } from '../types';
import { formatPhotoUrl, DEFAULT_ACTIVITY_PHOTO } from '../utils/photo';
import {
  X,
  MapPin,
  Clock,
  User,
  Building,
  Tag,
  ExternalLink,
  Camera,
  Maximize2,
  CheckCircle2,
  Clock3,
  Calendar,
  Layers,
  FileText,
  Navigation,
  Download,
  Building2
} from 'lucide-react';

interface ActivityDetailModalProps {
  activity: TeamActivity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !activity) return null;

  // Formatted photo URL
  const displayPhoto = formatPhotoUrl(activity.photoUrl);

  const siteDisplay = activity.siteName
    ? `${activity.siteId ? activity.siteId + ' - ' : ''}${activity.siteName}`
    : activity.locationName || 'Lokasi Lapangan';

  const formatWaktuDisplay = (dateStr?: string, timeStr?: string) => {
    let formattedDate = dateStr || '';
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const cleanTime = timeStr ? timeStr.replace(/\./g, ':') : '';
    return `${formattedDate}${cleanTime ? `, ${cleanTime}` : ''}`;
  };

  const isSelesai = activity.status?.toLowerCase().includes('selesai');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {activity.category || 'Aktivitas'}
                </span>
                {activity.status && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                      isSelesai
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isSelesai ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock3 className="w-3 h-3 text-amber-600" />
                    )}
                    {activity.status}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate mt-0.5">
                {activity.title || siteDisplay}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Photo Preview Container */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[400px]">
              <img
                src={displayPhoto}
                alt={activity.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_ACTIVITY_PHOTO;
                }}
                className={`w-full h-full object-cover transition duration-300 ${
                  isZoomed ? 'scale-125 cursor-zoom-out' : 'group-hover:scale-105 cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              {/* Photo Overlay Tag */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>Foto Activity</span>
              </div>

              {/* Zoom Toggle Overlay Button */}
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-900 transition border border-white/20 shadow-lg"
                title={isZoomed ? 'Reset Zoom' : 'Perbesar Foto'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Action Links */}
            <div className="flex items-center gap-2">
              <a
                href={displayPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Buka Foto Ukuran Asli</span>
              </a>
              <a
                href={displayPhoto}
                download={`foto_activity_${activity.id}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
                title="Unduh Foto"
              >
                <Download className="w-4 h-4 text-slate-600" />
              </a>
            </div>
          </div>

          {/* Right Column: Activity Form Detail Info */}
          <div className="md:col-span-6 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              
              {/* Petugas / Personel Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Petugas / Pelaksana</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-slate-900">{activity.userName}</div>
                    {activity.userEmail && (
                      <div className="text-xs text-slate-500 font-medium">{activity.userEmail}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activity.userSubDivision && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                        {activity.userSubDivision}
                      </span>
                    )}
                    {activity.userCluster && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                        {activity.userCluster}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Site & Location Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Detail Site & Lokasi</span>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-500 w-20 shrink-0">Site:</span>
                    <span className="font-bold text-slate-900">{siteDisplay}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-500 w-20 shrink-0">Alamat:</span>
                    <span className="text-slate-700 font-medium">{activity.locationName}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-500 w-20 shrink-0">Koordinat:</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {activity.lat.toFixed(6)}, {activity.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time & Date Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Waktu Pelaksanaan</span>
                </div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{formatWaktuDisplay(activity.date, activity.time)}</span>
                </div>
              </div>

              {/* Description / Notes */}
              {activity.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Catatan Lapangan</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {activity.description}
                  </p>
                </div>
              )}

            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition"
              >
                <Navigation className="w-4 h-4" />
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Tutup
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
