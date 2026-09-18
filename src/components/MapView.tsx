import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TeamUser, TeamActivity } from '../types';
import { getSiteDisplay, formatWaktuDisplay } from '../services/googleSheets';
import {
  Clock,
  MapPin,
  Layers,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface MapViewProps {
  activities: TeamActivity[];
  users: TeamUser[];
  selectedActivity: TeamActivity | null;
  selectedUserId: string; // 'ALL' or specific user ID
  onSelectActivity: (activity: TeamActivity | null) => void;
  showTrail: boolean;
}

// Tile Layer configurations for Leaflet
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: 'Satelit Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  positron: {
    name: 'Kartu Terang',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// Component to handle auto-centering and bounds fitting
const MapController: React.FC<{
  activities: TeamActivity[];
  selectedActivity: TeamActivity | null;
}> = ({ activities, selectedActivity }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedActivity && !isNaN(selectedActivity.lat) && !isNaN(selectedActivity.lng)) {
      map.flyTo([selectedActivity.lat, selectedActivity.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    } else if (activities.length > 0) {
      const validPoints = activities
        .filter(a => !isNaN(a.lat) && !isNaN(a.lng))
        .map(a => [a.lat, a.lng] as [number, number]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    }
  }, [map, selectedActivity, activities]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  activities,
  users,
  selectedActivity,
  selectedUserId,
  onSelectActivity,
  showTrail,
}) => {
  const [activeTile, setActiveTile] = useState<'osm' | 'satellite' | 'positron'>('osm');
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  // Auto-open popup when selectedActivity changes
  useEffect(() => {
    if (selectedActivity && markerRefs.current[selectedActivity.id]) {
      const marker = markerRefs.current[selectedActivity.id];
      if (marker) {
        const timer = setTimeout(() => {
          marker.openPopup();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedActivity]);

  // Center around Jakarta / Indonesia or first activity
  const defaultCenter = useMemo<[number, number]>(() => {
    if (activities.length > 0 && !isNaN(activities[0].lat) && !isNaN(activities[0].lng)) {
      return [activities[0].lat, activities[0].lng];
    }
    return [-6.2088, 106.8456];
  }, [activities]);

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

  // Sequence Map for numbering markers (1, 2, 3...) chronologically per user
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

  // Group activities per user for drawing route polylines in chronological order
  const userPolylines = useMemo(() => {
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

    const result: { userId: string; color: string; path: [number, number][] }[] = [];

    userGroups.forEach((group, groupKey) => {
      if (selectedUserId !== 'ALL') {
        const selectedUserObj = users.find(u => u.id === selectedUserId);
        const matchesSelected =
          groupKey === selectedUserId ||
          (selectedUserObj && group.name.toLowerCase() === selectedUserObj.name.toLowerCase());
        if (!matchesSelected) return;
      }

      // Sort activities chronologically by date and time from earliest to latest
      const sortedActs = [...group.acts].sort((a, b) => {
        const timeA = `${a.date || ''} ${a.time || ''}`;
        const timeB = `${b.date || ''} ${b.time || ''}`;
        return timeA.localeCompare(timeB);
      });

      if (sortedActs.length >= 2) {
        const color = group.user?.color || getUserColor(groupKey, group.name);
        const path = sortedActs.map(a => [a.lat, a.lng] as [number, number]);
        result.push({ userId: groupKey, color, path });
      }
    });

    return result;
  }, [activities, selectedUserId, showTrail, users]);

  // Create custom Leaflet DivIcon for markers
  const createMarkerIcon = (activity: TeamActivity, isSelected: boolean) => {
    const color = getUserColor(activity.userId, activity.userName);
    const avatar = getUserAvatar(activity.userId);
    const initial = (activity.userName && activity.userName.trim().length > 0)
      ? activity.userName.trim()[0].toUpperCase()
      : 'U';
    const seqNum = userActivitySeq.get(activity.id) || 1;

    const html = `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.2s ease; position: relative;">
        <!-- Chronological Sequence Badge (#1, #2, #3...) -->
        <div style="position: absolute; top: -6px; right: -6px; background-color: #0f172a; color: white; border: 1.5px solid white; border-radius: 9999px; font-size: 10px; font-weight: 800; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 10;">
          ${seqNum}
        </div>
        <div style="width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid ${color}; background-color: white; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
          ${
            avatar
              ? `<img src="${avatar}" style="width:100%; height:100%; object-fit:cover;" />`
              : `<div style="width:100%; height:100%; background-color:${color}; color:white; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center; text-transform:uppercase;">${initial}</div>`
          }
        </div>
        <div style="width: 10px; height: 10px; background-color: ${color}; transform: rotate(45deg); margin-top: -6px; border-bottom-right-radius: 2px;"></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-div-icon',
      html,
      iconSize: [40, 42],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
    });
  };

  return (
    <div className="relative w-full h-full min-h-[450px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex flex-col z-0">
      
      {/* Leaflet MapContainer */}
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', flex: 1 }}
        className="z-0"
      >
        <TileLayer
          attribution={TILE_LAYERS[activeTile].attribution}
          url={TILE_LAYERS[activeTile].url}
        />

        {/* Map Bounds & Zoom Controller */}
        <MapController activities={activities} selectedActivity={selectedActivity} />

        {/* Polyline Movement Trails */}
        {userPolylines.map(line => (
          <Polyline
            key={line.userId}
            positions={line.path}
            pathOptions={{
              color: line.color,
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        ))}

        {/* Activity Markers */}
        {activities.map(activity => {
          if (isNaN(activity.lat) || isNaN(activity.lng)) return null;

          const isSelected = selectedActivity?.id === activity.id;
          const icon = createMarkerIcon(activity, isSelected);

          return (
            <Marker
              key={activity.id}
              ref={ref => {
                if (ref) {
                  markerRefs.current[activity.id] = ref;
                }
              }}
              position={[activity.lat, activity.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectActivity(activity),
              }}
            >
              <Popup>
                <div className="p-1.5 max-w-[240px] font-sans text-slate-800">
                  {/* Name Title */}
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {activity.userName}
                  </h3>

                  {/* Category Pill Badge */}
                  <div className="mt-1 mb-2">
                    <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md">
                      {activity.category || 'Aktivitas'}
                    </span>
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

                  {/* Buka Google Maps Button */}
                  <div className="mt-2.5 pt-1">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-lg border border-blue-200/80 transition no-underline w-full justify-center"
                    >
                      <span>Buka Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Layer Control Switcher */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-md">
        <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
        {(Object.keys(TILE_LAYERS) as (keyof typeof TILE_LAYERS)[]).map(key => (
          <button
            key={key}
            onClick={() => setActiveTile(key)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition ${
              activeTile === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {TILE_LAYERS[key].name}
          </button>
        ))}
      </div>

    </div>
  );
};
