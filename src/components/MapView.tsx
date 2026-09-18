import React, { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { TeamUser, TeamActivity } from '../types';
import { formatPhotoUrl, DEFAULT_ACTIVITY_PHOTO } from '../utils/photo';
import { getSiteDisplay, formatWaktuDisplay } from '../services/googleSheets';
import {
  Clock,
  MapPin,
  Layers,
  MessageSquare,
  Camera,
  Maximize2
} from 'lucide-react';

interface MapViewProps {
  activities: TeamActivity[];
  users: TeamUser[];
  selectedActivity: TeamActivity | null;
  selectedUserId: string; // 'ALL' or specific user ID
  onSelectActivity: (activity: TeamActivity | null) => void;
  onViewPhoto?: (activity: TeamActivity) => void;
  showTrail: boolean;
}

// Controller to auto-pan and zoom when selectedActivity or bounds change
const MapController: React.FC<{
  selectedActivity: TeamActivity | null;
  activities: TeamActivity[];
}> = ({ selectedActivity, activities }) => {
  const map = useMap();

  // Invalidate map size on initial mount so tiles always render completely
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (selectedActivity && !isNaN(selectedActivity.lat) && !isNaN(selectedActivity.lng)) {
      map.flyTo([selectedActivity.lat, selectedActivity.lng], 16, {
        duration: 0.8,
      });
    } else if (!selectedActivity && activities.length > 0) {
      const validActivities = activities.filter(a => !isNaN(a.lat) && !isNaN(a.lng));
      if (validActivities.length > 0) {
        const bounds = L.latLngBounds(validActivities.map(a => [a.lat, a.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [selectedActivity, activities, map]);

  return null;
};

// Map Layer Providers (100% Free, NO API Key Required)
interface TileLayerConfig {
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

const TILE_LAYERS: Record<string, TileLayerConfig> = {
  street: {
    name: 'Jalan (Esri Street)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom',
    subdomains: 'abc',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satelit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 19,
  },
  hot: {
    name: 'Humanitarian (HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
};

export const MapView: React.FC<MapViewProps> = ({
  activities,
  users,
  selectedActivity,
  selectedUserId,
  onSelectActivity,
  onViewPhoto,
  showTrail,
}) => {
  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>('street');

  // Helper to get user color
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

  // Center around activities or default to Jakarta
  const centerPosition: [number, number] = useMemo(() => {
    if (activities.length > 0 && !isNaN(activities[0].lat) && !isNaN(activities[0].lng)) {
      return [activities[0].lat, activities[0].lng];
    }
    return [-6.2088, 106.8456]; // Jakarta
  }, [activities]);

  // Group activities per user for movement trail polylines
  const userTrails = useMemo(() => {
    if (!showTrail) return [];

    const userGroups = new Map<string, { user: TeamUser | null; name: string; acts: TeamActivity[] }>();

    activities.forEach(act => {
      if (isNaN(act.lat) || isNaN(act.lng)) return;

      const matchedUser = users.find(
        u => u.id === act.userId || u.name.toLowerCase() === act.userName.toLowerCase() || (u.email && act.userId.includes(u.email))
      );

      const groupKey = matchedUser ? matchedUser.id : act.userName.toLowerCase();

      if (!userGroups.has(groupKey)) {
        userGroups.set(groupKey, {
          user: matchedUser || null,
          name: act.userName,
          acts: [],
        });
      }
      userGroups.get(groupKey)!.acts.push(act);
    });

    const trails: { userId: string; color: string; positions: [number, number][] }[] = [];

    userGroups.forEach((group, groupKey) => {
      if (selectedUserId !== 'ALL') {
        const selectedUserObj = users.find(u => u.id === selectedUserId);
        const matchesSelected =
          groupKey === selectedUserId ||
          (selectedUserObj && group.name.toLowerCase() === selectedUserObj.name.toLowerCase());
        if (!matchesSelected) return;
      }

      const sortedActs = [...group.acts].sort((a, b) => {
        const timeA = `${a.date || ''} ${a.time || ''}`;
        const timeB = `${b.date || ''} ${b.time || ''}`;
        return timeA.localeCompare(timeB);
      });

      if (sortedActs.length >= 2) {
        const color = group.user?.color || getUserColor(groupKey, group.name);
        trails.push({
          userId: groupKey,
          color,
          positions: sortedActs.map(a => [a.lat, a.lng]),
        });
      }
    });

    return trails;
  }, [activities, selectedUserId, showTrail, users]);

  // Sequence Map: Give each activity a chronological 1, 2, 3... index per user
  const userActivitySeq = useMemo(() => {
    const seqMap = new Map<string, number>();
    const grouped = new Map<string, TeamActivity[]>();

    activities.forEach(a => {
      const matchedUser = users.find(
        u => u.id === a.userId || u.name.toLowerCase() === a.userName.toLowerCase() || (u.email && a.userId.includes(u.email))
      );
      const groupKey = matchedUser ? matchedUser.id : a.userName.toLowerCase();
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey)!.push(a);
    });

    grouped.forEach(acts => {
      const sorted = [...acts].sort((a, b) => {
        const timeA = `${a.date || ''} ${a.time || ''}`;
        const timeB = `${b.date || ''} ${b.time || ''}`;
        return timeA.localeCompare(timeB);
      });

      sorted.forEach((act, idx) => {
        seqMap.set(act.id, idx + 1);
      });
    });

    return seqMap;
  }, [activities, users]);

  // Create Custom Avatar Pin Icon
  const createCustomIcon = (activity: TeamActivity, isSelected: boolean) => {
    const color = getUserColor(activity.userId, activity.userName);
    const avatar = getUserAvatar(activity.userId);
    const initial = (activity.userName && activity.userName.trim().length > 0)
      ? activity.userName.trim()[0].toUpperCase()
      : 'U';
    const seqNum = userActivitySeq.get(activity.id) || 1;

    const html = `
      <div class="custom-map-pin" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.2s ease;">
        <!-- Chronological Sequence Badge (#1, #2, #3...) -->
        <div style="
          position: absolute;
          top: -6px;
          right: -6px;
          background-color: #0f172a;
          color: white;
          border: 1.5px solid white;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 800;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 10;
        ">
          ${seqNum}
        </div>

        <!-- Avatar Circle -->
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2.5px solid ${color};
          background-color: white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(0,0,0,0.25);
        ">
          ${
            avatar
              ? `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : `<div style="width: 100%; height: 100%; background-color: ${color}; color: white; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; text-transform: uppercase;">${initial}</div>`
          }
        </div>
        
        <!-- Pin Point Indicator -->
        <div style="
          width: 10px;
          height: 10px;
          background-color: ${color};
          transform: rotate(45deg);
          margin-top: -6px;
          border-bottom-right-radius: 2px;
        "></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html,
      iconSize: [40, 42],
      iconAnchor: [20, 42],
      popupAnchor: [155, 135], // Anchor badge to the right side of the marker
    });
  };

  return (
    <div className="relative w-full h-full min-h-[450px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex flex-col z-0">
      
      {/* Floating Basemap Selector */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200/90 shadow-md">
        <Layers className="w-3.5 h-3.5 text-slate-500 ml-1" />
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((layerKey) => (
            <button
              key={layerKey}
              onClick={() => setActiveLayer(layerKey)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeLayer === layerKey
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {TILE_LAYERS[layerKey].name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Container */}
      <MapContainer
        center={centerPosition}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full flex-1 z-0"
        attributionControl={true}
      >
        <MapController
          selectedActivity={selectedActivity}
          activities={activities}
        />

        <TileLayer
          key={activeLayer}
          url={TILE_LAYERS[activeLayer].url}
          attribution={TILE_LAYERS[activeLayer].attribution}
          subdomains={TILE_LAYERS[activeLayer].subdomains}
          maxZoom={TILE_LAYERS[activeLayer].maxZoom}
        />

        {/* Movement Trails */}
        {showTrail &&
          userTrails.map((trail, index) => (
            <React.Fragment key={`trail-fragment-${trail.userId}-${index}`}>
              {/* Outer Glow / Casing */}
              <Polyline
                positions={trail.positions}
                pathOptions={{
                  color: '#ffffff',
                  weight: 6,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner Dashed Line */}
              <Polyline
                positions={trail.positions}
                pathOptions={{
                  color: trail.color,
                  weight: 3.5,
                  opacity: 0.95,
                  dashArray: '8, 8',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </React.Fragment>
          ))}

        {/* Activity Markers */}
        {activities.map(activity => {
          if (isNaN(activity.lat) || isNaN(activity.lng)) return null;

          const isSelected = selectedActivity?.id === activity.id;
          const icon = createCustomIcon(activity, isSelected);

          return (
            <Marker
              key={activity.id}
              position={[activity.lat, activity.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectActivity(activity),
              }}
            >
              <Popup
                className="side-marker-popup"
                autoPan={true}
                autoPanPadding={[40, 40]}
              >
                <div className="p-1.5 max-w-[240px] font-sans text-slate-800">
                  {/* Name Title */}
                  <h3 className="font-bold text-sm text-slate-900 leading-snug mb-2 pr-6">
                    {activity.userName}
                  </h3>

                  {/* Photo Thumbnail Preview Card */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewPhoto) onViewPhoto(activity);
                      }}
                      className="w-full group relative overflow-hidden rounded-xl border border-indigo-200/80 bg-slate-900 p-0.5 transition shadow-sm cursor-pointer hover:border-indigo-400 text-left"
                    >
                      <div className="relative w-full h-28 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900">
                        <img
                          src={formatPhotoUrl(activity.photoUrl)}
                          alt="Preview Foto Activity"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_ACTIVITY_PHOTO;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    </button>

                    {/* Tombol Foto di bawah foto */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewPhoto) onViewPhoto(activity);
                      }}
                      className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] rounded-lg transition cursor-pointer border border-indigo-200/80 shadow-xs"
                      title="Lihat Foto & Detail Activity di Modal Besar"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Foto</span>
                      <Maximize2 className="w-2.5 h-2.5 text-indigo-500" />
                    </button>
                  </div>

                  <div className="border-t border-slate-100 my-2 pt-2 space-y-2">
                    {/* Location / Site */}
                    <div className="flex items-start gap-1.5 text-xs font-semibold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Site: {getSiteDisplay(activity)}
                      </span>
                    </div>

                    {/* Note / Description */}
                    {activity.description && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{activity.description}</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Waktu: {formatWaktuDisplay(activity.date, activity.time)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
