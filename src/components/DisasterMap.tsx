import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident, Depot, Allocation, DisasterType, SeverityLabel } from '../types.js';
import { Filter, Layers, Navigation, Compass } from 'lucide-react';

interface DisasterMapProps {
  incidents: Incident[];
  depots: Depot[];
  allocations: Allocation[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  disasterFilter: string;
  setDisasterFilter: (val: string) => void;
  severityFilter: string;
  setSeverityFilter: (val: string) => void;
}

export default function DisasterMap({
  incidents,
  depots,
  allocations,
  selectedIncidentId,
  onSelectIncident,
  disasterFilter,
  setDisasterFilter,
  severityFilter,
  setSeverityFilter,
}: DisasterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);

  // Apply filters on the list of incidents
  const filteredIncidents = incidents.filter(inc => {
    const matchesDisaster = disasterFilter === 'All' || inc.disasterType === disasterFilter;
    const matchesSeverity = severityFilter === 'All' || inc.severityLabel === severityFilter;
    return matchesDisaster && matchesSeverity;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use Tamil Nadu center for default zoom
    const map = L.map(mapContainerRef.current, {
      center: [11.5, 78.5],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    // Elegant dark mode theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    routesRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Markers and Routes
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markersRef.current;
    const routeGroup = routesRef.current;

    if (!map || !markerGroup || !routeGroup) return;

    // Clear previous elements
    markerGroup.clearLayers();
    routeGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 1. Draw Depots
    depots.forEach(depot => {
      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-60"></div>
            <div class="absolute w-7 h-7 bg-indigo-600 border border-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const depotMarker = L.marker([depot.lat, depot.lng], { icon: depotIcon })
        .bindTooltip(`<strong>${depot.name}</strong><br/>District: ${depot.district}`, {
          permanent: false,
          direction: 'top',
          className: 'bg-slate-900 text-white border-none rounded-md px-2 py-1 text-xs font-sans',
        });

      depotMarker.addTo(markerGroup);
      bounds.push([depot.lat, depot.lng]);
    });

    // 2. Draw Incidents
    filteredIncidents.forEach(inc => {
      const isSelected = inc.id === selectedIncidentId;
      
      let severityColor = 'bg-green-500 border-green-300 shadow-green-500/40';
      let pingColor = 'bg-green-500/40';
      if (inc.severityLabel === 'Medium') {
        severityColor = 'bg-yellow-500 border-yellow-300 shadow-yellow-500/40';
        pingColor = 'bg-yellow-500/40';
      } else if (inc.severityLabel === 'High') {
        severityColor = 'bg-orange-500 border-orange-300 shadow-orange-500/40';
        pingColor = 'bg-orange-500/40';
      } else if (inc.severityLabel === 'Critical') {
        severityColor = 'bg-rose-500 border-rose-300 shadow-rose-500/40 animate-pulse';
        pingColor = 'bg-rose-500/40';
      }

      if (inc.status === 'Resolved') {
        severityColor = 'bg-slate-500 border-slate-400 shadow-slate-500/20';
        pingColor = 'hidden';
      }

      // Icon style
      const incidentIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 ${isSelected ? 'scale-125 transition-transform' : ''}">
            <div class="absolute inset-0 rounded-full animate-ping ${pingColor}"></div>
            <div class="absolute w-5 h-5 rounded-full border-2 ${severityColor} flex items-center justify-center shadow-md">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const incidentMarker = L.marker([inc.lat, inc.lng], { icon: incidentIcon })
        .on('click', () => {
          onSelectIncident(isSelected ? null : inc.id);
        })
        .bindTooltip(`
          <div class="text-xs p-1">
            <span class="font-bold text-white">${inc.disasterType} [${inc.severityLabel}]</span><br/>
            <span class="text-slate-300">${inc.district} - Affected: ${inc.peopleAffected}</span>
          </div>
        `, {
          permanent: false,
          direction: 'top',
          className: 'bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1',
        });

      incidentMarker.addTo(markerGroup);
      bounds.push([inc.lat, inc.lng]);

      // 3. Draw Polylines for Dispatched Resources
      if (inc.status !== 'Resolved') {
        const incAllocations = allocations.filter(a => a.incidentId === inc.id);
        incAllocations.forEach(alloc => {
          // Find depot resource info
          const depot = depots.find(d => d.id === (alloc.resourceId.startsWith('res_ch_') ? 'depot_chennai' : 
                                                 alloc.resourceId.startsWith('res_cbe_') ? 'depot_coimbatore' :
                                                 alloc.resourceId.startsWith('res_try_') ? 'depot_trichy' :
                                                 alloc.resourceId.startsWith('res_mdu_') ? 'depot_madurai' : 'depot_ooty'));
          if (depot) {
            const pathLine = L.polyline([[depot.lat, depot.lng], [inc.lat, inc.lng]], {
              color: inc.severityLabel === 'Critical' ? '#ef4444' : '#38bdf8',
              weight: isSelected ? 3.5 : 1.5,
              opacity: isSelected ? 0.9 : 0.4,
              dashArray: '5, 8 animate-dash',
            });

            pathLine.addTo(routeGroup);
          }
        });
      }
    });

    // Auto fit to bounds of all elements
    if (bounds.length > 0 && map) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredIncidents, depots, allocations, selectedIncidentId]);

  // Handle map center adjustments if selectedIncident changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIncidentId) return;

    const selectedInc = incidents.find(i => i.id === selectedIncidentId);
    if (selectedInc) {
      map.setView([selectedInc.lat, selectedInc.lng], 12, { animate: true });
    }
  }, [selectedIncidentId, incidents]);

  return (
    <div id="map-module-container" className="h-full w-full bento-card overflow-hidden relative flex flex-col">
      {/* Map Filter Controls Bar */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-300 text-xs font-medium shadow-xl">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <span>Filters:</span>
        </div>

        {/* Disaster Type Filter */}
        <select
          value={disasterFilter}
          onChange={(e) => setDisasterFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white text-xs outline-none cursor-pointer focus:border-sky-400 transition-colors shadow-xl"
        >
          <option value="All">All Hazards</option>
          <option value="Flood">Floods</option>
          <option value="Cyclone">Cyclones</option>
          <option value="Earthquake">Tremors</option>
          <option value="Fire">Fires</option>
          <option value="Landslide">Landslides</option>
        </select>

        {/* Severity Label Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white text-xs outline-none cursor-pointer focus:border-sky-400 transition-colors shadow-xl"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] p-3 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-300 text-[10px] space-y-1.5 shadow-xl hidden sm:block">
        <p className="font-bold text-white uppercase tracking-wider text-[9px] border-b border-slate-800/80 pb-1 mb-1">Command Legend</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-sky-500 rounded-md border border-sky-300 flex items-center justify-center">
            <span className="w-1 h-1 bg-white rounded-full"></span>
          </span>
          <span className="font-medium text-slate-200">Disaster Depot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300 shadow"></span>
          <span>Critical Incident</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-300 shadow"></span>
          <span>High Severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-300 shadow"></span>
          <span>Medium Severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 border border-green-300 shadow"></span>
          <span>Low Severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-400 shadow"></span>
          <span>Resolved</span>
        </div>
      </div>

      {/* Actual Map DOM Node */}
      <div ref={mapContainerRef} className="flex-1 w-full bg-slate-950" />

      {/* CSS style overlay to animate dashed route paths */}
      <style>{`
        .animate-dash {
          stroke-dasharray: 6, 10;
          animation: routeFlow 25s linear infinite;
        }
        @keyframes routeFlow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -500;
          }
        }
      `}</style>
    </div>
  );
}
