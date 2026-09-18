import React, { useState } from 'react';
import { TeamActivity, TeamUser } from '../types';
import { X, MapPin, Navigation, Calendar, Clock, PlusCircle } from 'lucide-react';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: TeamUser[];
  onAddActivity: (activity: TeamActivity) => void;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddActivity,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const timeNowStr = new Date().toTimeString().slice(0, 5);

  const [userId, setUserId] = useState(users[0]?.id || 'USR001');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState(-6.2088);
  const [lng, setLng] = useState(106.8456);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(timeNowStr);
  const [category, setCategory] = useState('Kunjungan Client');
  const [isLocating, setIsLocating] = useState(false);

  // Get current device GPS location
  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLat(parseFloat(pos.coords.latitude.toFixed(5)));
          setLng(parseFloat(pos.coords.longitude.toFixed(5)));
          if (!locationName) {
            setLocationName(`Lokasi Saya (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          }
          setIsLocating(false);
        },
        err => {
          console.warn('Geolocation error:', err);
          alert('Gagal mendapatkan lokasi GPS perangkat. Menggunakan koordinat Jakarta.');
          setIsLocating(false);
        }
      );
    } else {
      alert('Fitur Geolocation tidak didukung peramban ini.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !locationName.trim()) {
      alert('Mohon isi judul kegiatan dan lokasi.');
      return;
    }

    const selectedUser = users.find(u => u.id === userId);

    const newActivity: TeamActivity = {
      id: `ACT_${Date.now().toString().slice(-6)}`,
      userId,
      userName: selectedUser?.name || 'Anggota Tim',
      date,
      time,
      title,
      description,
      locationName,
      lat: Number(lat),
      lng: Number(lng),
      category,
      status: 'Selesai',
    };

    onAddActivity(newActivity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Catat Aktivitas Tim</h3>
              <p className="text-xs text-slate-500">Tambah entri kegiatan harian baru ke peta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Petugas / User Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Petugas / Anggota Tim</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Judul Kegiatan</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kunjungan Client PT Telkom"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Waktu (Jam)</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Nama Lokasi / Tempat</label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Mengambil GPS...' : 'Gunakan GPS Saat Ini'}</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Contoh: Gedung Landmark Tower Lt. 12, Jakarta"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Coordinates (Lat, Lng) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={e => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={e => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Kunjungan Client">Kunjungan Client</option>
              <option value="Inspeksi">Inspeksi</option>
              <option value="Meeting">Meeting</option>
              <option value="Survei">Survei</option>
              <option value="Briefing">Briefing</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Catatan Lapangan</label>
            <textarea
              rows={3}
              placeholder="Catatan detail hasil kunjungan atau pekerjaan..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition"
            >
              Simpan Ke Peta
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
