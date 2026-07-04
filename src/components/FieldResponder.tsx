import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident, Allocation, Depot, Resource } from '../types.js';
import { ShieldCheck, MapPin, HardHat, Compass, AlertCircle, HeartHandshake } from 'lucide-react';

interface FieldResponderProps {
  incidents: Incident[];
  allocations: Allocation[];
  depots: Depot[];
  resources: Resource[];
  onResolveIncident: (id: string, responderName: string) => void;
}

const RESPONDER_TEAMS = [
  { id: 'resp_chennai', name: 'Chennai Disaster Response Force', district: 'Chennai' },
  { id: 'resp_coimbatore', name: 'Coimbatore Fire & Rescue Command', district: 'Coimbatore' },
  { id: 'resp_nilgiris', name: 'Nilgiris Mountain Rescue Crew', district: 'Nilgiris' },
  { id: 'resp_trichy', name: 'Trichy Delta Irrigation Patrol', district: 'Trichy' },
  { id: 'resp_madurai', name: 'Madurai Southern Relief Division', district: 'Madurai' },
];

export default function FieldResponder({
  incidents,
  allocations,
  depots,
  resources,
  onResolveIncident,
}: FieldResponderProps) {
  const [selectedTeamId, setSelectedTeamId] = useState('resp_chennai');
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<L.Map | null>(null);
  const miniMapMarkerGroupRef = useRef<L.LayerGroup | null>(null);

  const currentTeam = RESPONDER_TEAMS.find(t => t.id === selectedTeamId)!;

  // Filter incidents for this responder team's district that are not resolved
  const teamIncidents = incidents.filter(
    inc => inc.district === currentTeam.district && inc.status !== 'Resolved'
  );

  // Set first team incident as active by default if none selected or if active incident is resolved
  useEffect(() => {
    if (teamIncidents.length > 0) {
      const activeExists = teamIncidents.some(i => i.id === activeIncidentId);
      if (!activeExists) {
        setActiveIncidentId(teamIncidents[0].id);
      }
    } else {
      setActiveIncidentId(null);
    }
  }, [teamIncidents, activeIncidentId]);

  const activeInc = teamIncidents.find(i => i.id === activeIncidentId);
  const activeAllocations = activeInc
    ? allocations.filter(a => a.incidentId === activeInc.id)
    : [];

  // Mini Map Synchronization
  useEffect(() => {
    if (!miniMapContainerRef.current) return;

    // Create map if doesn't exist
    if (!miniMapRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(map);

      miniMapRef.current = map;
      miniMapMarkerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = miniMapRef.current;
    const markerGroup = miniMapMarkerGroupRef.current;

    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    if (activeInc) {
      map.setView([activeInc.lat, activeInc.lng], 12);

      // Create glowing target red marker
      const incIcon = L.divIcon({
        className: 'mini-inc-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute inset-0 rounded-full bg-rose-500/40 animate-ping"></div>
            <div class="absolute w-4 h-4 rounded-full border-2 border-rose-300 bg-rose-500 shadow-md"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([activeInc.lat, activeInc.lng], { icon: incIcon }).addTo(markerGroup);

      // Plot nearest depot and route line
      const activeDepot = depots.find(d => d.district === activeInc.district);
      if (activeDepot) {
        const depotIcon = L.divIcon({
          className: 'mini-dep-marker',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <div class="absolute w-4 h-4 rounded bg-indigo-600 border border-indigo-400"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([activeDepot.lat, activeDepot.lng], { icon: depotIcon }).addTo(markerGroup);

        L.polyline([[activeDepot.lat, activeDepot.lng], [activeInc.lat, activeInc.lng]], {
          color: '#6366f1',
          weight: 2,
          opacity: 0.8,
          dashArray: '4, 6',
        }).addTo(markerGroup);
      }
    } else {
      // Default view centering Tamil Nadu
      map.setView([11.1, 78.6], 6);
    }
  }, [activeInc, depots]);

  const handleResolve = () => {
    if (!activeInc) return;
    onResolveIncident(activeInc.id, currentTeam.name);
  };

  return (
    <div id="responder-view-card" className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {/* Team Selection and Incident Queue list */}
      <div className="md:col-span-1 flex flex-col bento-card p-5 overflow-hidden">
        <div className="border-b border-slate-800/80 pb-3 mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Active Field Responder</h3>
          </div>

          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer focus:border-sky-400"
          >
            {RESPONDER_TEAMS.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Assigned Incidents</h4>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {teamIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <ShieldCheck className="w-10 h-10 mb-2 text-emerald-500/60" />
              <p className="text-xs font-bold text-slate-400">Zero Pending Operations!</p>
              <p className="text-[10px] text-slate-600 mt-0.5">All disaster scenarios in {currentTeam.district} district are resolved.</p>
            </div>
          ) : (
            teamIncidents.map(inc => {
              const isActive = inc.id === activeIncidentId;
              let badgeStyle = 'bg-green-500/10 border-green-500/20 text-green-400';
              if (inc.severityLabel === 'Medium') badgeStyle = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
              if (inc.severityLabel === 'High') badgeStyle = 'bg-orange-500/10 border-orange-500/20 text-orange-400';
              if (inc.severityLabel === 'Critical') badgeStyle = 'bg-rose-500/10 border-rose-500/20 text-rose-400';

              return (
                <div
                  key={inc.id}
                  onClick={() => setActiveIncidentId(inc.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isActive
                      ? 'bg-slate-900 border-sky-400 glow-accent shadow-md shadow-sky-500/5'
                      : 'bg-slate-950/20 border-slate-800/60 hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{inc.disasterType}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${badgeStyle}`}>{inc.severityLabel}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Action Workspace for the selected active assignment */}
      <div className="md:col-span-2 flex flex-col bento-card p-5 overflow-hidden relative justify-between">
        {activeInc ? (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* Incident Details Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    <span>Zone Action Plan: {activeInc.district}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Coordinates: {activeInc.lat.toFixed(4)}, {activeInc.lng.toFixed(4)}</p>
                </div>

                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1.5 text-[10px] font-mono">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Severity Index: {activeInc.severityScore}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide text-[9px] text-sky-400 mb-1">Scenario Log</p>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{activeInc.description}</p>
              </div>

              {/* Arriving Resources & ETAs */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">Inbound Support Units</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activeAllocations.length === 0 ? (
                    <div className="col-span-full p-3 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                      No matching resource allocations detected. Waiting for Operator optimization.
                    </div>
                  ) : (
                    activeAllocations.map(alloc => (
                      <div key={alloc.id} className="p-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-300 truncate">{alloc.resourceType}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-lg font-extrabold text-white font-mono">{alloc.quantity}</span>
                          <span className="text-[10px] text-sky-400 font-bold font-mono">ETA {alloc.etaMinutes}m</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Mini Map Preview and Action button */}
            <div className="space-y-3">
              <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-800 relative">
                <div ref={miniMapContainerRef} className="h-full w-full bg-slate-950" />
                <div className="absolute top-2 right-2 z-[1000] p-1.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300 pointer-events-none flex items-center gap-1 text-[9px] font-bold">
                  <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" />
                  <span>Interactive Map Frame</span>
                </div>
              </div>

              {/* Mark as Resolved trigger */}
              <button
                onClick={handleResolve}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Mark Operations as Resolved & Release Assets</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <ShieldCheck className="w-12 h-12 mb-3 text-emerald-500/50" />
            <h3 className="text-sm font-bold text-slate-300">Operations Complete!</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">There are no pending reports for {currentTeam.name} in {currentTeam.district} district. Rest and wait for further incident signals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
