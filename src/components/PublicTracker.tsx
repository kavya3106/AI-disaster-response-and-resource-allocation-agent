import React, { useState, useEffect } from 'react';
import { MapPin, Search, AlertTriangle, ShieldAlert, LifeBuoy, X, CheckCircle, Home, Utensils, Loader, HelpCircle } from 'lucide-react';
import IncidentReportForm, { DISTRICT_PRESETS } from './IncidentReportForm.tsx';

interface PublicLookupResponse {
  nearbyIncidents: {
    id: string;
    district: string;
    disasterType: string;
    severityLabel: string;
    status: string;
    distanceKm: number;
    peopleAffected: number;
    allocations: {
      resourceType: string;
      quantity: number;
      status: string; // Dispatched | EnRoute | Active | Resolved
      etaMinutes: number;
    }[];
  }[];
  nearbyDepots: {
    id: string;
    name: string;
    district: string;
    distanceKm: number;
    resources: {
      type: string;       // e.g. "Shelter Space", "Food Supply"
      available: number;
      total: number;
    }[];
  }[];
}

interface PublicTrackerProps {
  onAddManualIncident: (incidentData: any) => Promise<void>;
  incidents: any[];
  allocations: any[];
  depots: any[];
  resources: any[];
}

// Client-side Haversine helper to find nearest district presets for GPS resolved coords
const clientHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findClosestDistrict = (lat: number, lng: number) => {
  let closestName = 'Unknown';
  let minDistance = Infinity;
  for (const [name, coords] of Object.entries(DISTRICT_PRESETS)) {
    const dist = clientHaversine(lat, lng, Number(coords.lat), Number(coords.lng));
    if (dist < minDistance) {
      minDistance = dist;
      closestName = name;
    }
  }
  return { name: closestName, distance: minDistance };
};

export default function PublicTracker({
  onAddManualIncident,
  incidents,
  allocations,
  depots,
  resources,
}: PublicTrackerProps) {
  const [districtInput, setDistrictInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedLocationName, setResolvedLocationName] = useState('');
  const [radiusKm] = useState(15);

  const [lookupData, setLookupData] = useState<PublicLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Trigger public lookup query
  const fetchLookup = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/lookup?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
      if (!res.ok) throw new Error('Could not retrieve local coordinates info.');
      const data = await res.json();
      setLookupData(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading safety info.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever WS updates state, so lookup data is real-time
  useEffect(() => {
    if (resolvedCoords) {
      fetchLookup(resolvedCoords.lat, resolvedCoords.lng);
    }
  }, [incidents, allocations, depots, resources]);

  const handleInputChange = (val: string) => {
    setDistrictInput(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const query = val.toLowerCase().trim();
    const matches = Object.keys(DISTRICT_PRESETS).filter((d) =>
      d.toLowerCase().includes(query)
    );
    setSuggestions(matches);
  };

  const selectDistrict = (name: string) => {
    setDistrictInput(name);
    setSuggestions([]);
    const preset = DISTRICT_PRESETS[name];
    if (preset) {
      const coords = { lat: Number(preset.lat), lng: Number(preset.lng) };
      setResolvedCoords(coords);
      setResolvedLocationName(name);
      fetchLookup(coords.lat, coords.lng);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setResolvedCoords(coords);
        
        const closest = findClosestDistrict(latitude, longitude);
        setResolvedLocationName(
          closest.distance < 30
            ? `My Location (near ${closest.name})`
            : `My Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        );
        setIsLocating(false);
        fetchLookup(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setError('Could not access device location. Please type your area name instead.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      await onAddManualIncident(formData);
      setReportSuccess(true);
      setShowReportForm(false);
      // Auto dismiss success toast after 8 seconds
      setTimeout(() => setReportSuccess(false), 8000);
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    }
  };

  const getDisasterEmoji = (type: string) => {
    switch (type) {
      case 'Flood': return '🌊';
      case 'Cyclone': return '🌀';
      case 'Earthquake': return '🫨';
      case 'Fire': return '🔥';
      case 'Landslide': return '🏔️';
      default: return '⚠️';
    }
  };

  const mapAllocationStatus = (status: string) => {
    switch (status) {
      case 'Dispatched': return 'Dispatched from depot';
      case 'EnRoute': return 'On the way';
      case 'Active': return 'On site now';
      case 'Resolved': return 'Completed';
      default: return status;
    }
  };

  const mapAllocationStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-teal-600 font-bold';
      case 'EnRoute': return 'text-sky-600 font-semibold animate-pulse';
      case 'Dispatched': return 'text-amber-600';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-slate-800 font-sans">
      
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-sky-600 to-teal-600 text-white rounded-3xl p-6 shadow-lg shadow-sky-600/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight leading-tight">Tamil Nadu State Disaster Management</h2>
            <p className="text-xs text-sky-100 font-medium tracking-wide uppercase">Citizen Emergency Public Resource Tracker</p>
          </div>
        </div>
        <p className="text-sm text-sky-50 leading-relaxed font-medium">
          Check live dispatch routes, active rescue assets, and safety shelter resource availability within 15 km of your location.
        </p>
      </div>

      {/* Geolocation Lookup Control */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Find Help Near You</label>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={districtInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter District (e.g. Chennai, Trichy...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold outline-none focus:border-sky-500 focus:bg-white transition-all text-slate-850"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => selectDistrict(name)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    📍 {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isLocating ? (
              <Loader className="w-4 h-4 animate-spin text-sky-700" />
            ) : (
              <MapPin className="w-4 h-4 text-sky-750" />
            )}
            <span>Use my current location</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Success notification for filed reports */}
      {reportSuccess && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 text-emerald-850 rounded-3xl shadow-sm flex items-start gap-3.5 animate-fadeIn">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Assistance Request Logged</h4>
            <p className="text-xs text-emerald-700 leading-relaxed font-medium">
              Thank you. Your request for assistance has been submitted. Our automated dispatch system is already allocating optimal emergency resources. Real-time updates will show on this page.
            </p>
          </div>
        </div>
      )}

      {/* Lookup Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Mapping nearby resources...</p>
        </div>
      )}

      {/* Query Results */}
      {!loading && resolvedCoords && lookupData && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Results Header */}
          <div className="flex justify-between items-center bg-sky-50/50 px-4 py-2.5 rounded-2xl border border-sky-100/50">
            <span className="text-xs font-bold text-sky-750">
              Showing help status within 15 km of <strong>{resolvedLocationName}</strong>
            </span>
            <button
              onClick={() => {
                setResolvedCoords(null);
                setLookupData(null);
                setDistrictInput('');
              }}
              className="text-[10px] font-bold text-sky-600 hover:text-sky-850 uppercase cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Section: Nearby Incidents */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Nearby Active Incidents</h3>
            {lookupData.nearbyIncidents.length === 0 ? (
              <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-3xl p-6 text-center space-y-3">
                <p className="text-2xl">💚</p>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">No active incidents reported near you</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
                    We don't see any active hazard reports in your area. If you require help or wish to log a situation, submit a request below.
                  </p>
                </div>
                <button
                  onClick={() => setShowReportForm(true)}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow shadow-sky-600/10 cursor-pointer"
                >
                  Request Assistance
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lookupData.nearbyIncidents.map((inc) => (
                  <div key={inc.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    
                    {/* Incident Title */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                          <span>{getDisasterEmoji(inc.disasterType)}</span>
                          <span>{inc.disasterType} Incident</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                          {inc.district} district • <span className="text-sky-750">{inc.distanceKm} km away</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full">
                        {inc.severityLabel} Priority
                      </span>
                    </div>

                    {/* Allocation Statuses */}
                    <div className="border-t border-slate-50 pt-3 space-y-2.5">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatched Help Status:</h5>
                      {inc.allocations.length === 0 ? (
                        <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/40">
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          <span>Report logged — relief team is assembling rescue resources.</span>
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {inc.allocations.map((alloc, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100/40 font-medium">
                              <span className="font-bold text-slate-700">{alloc.quantity} × {alloc.resourceType}</span>
                              <div className="flex items-center gap-2 text-right">
                                <span className={mapAllocationStatusColor(alloc.status)}>
                                  {mapAllocationStatus(alloc.status)}
                                </span>
                                {alloc.status !== 'Resolved' && alloc.status !== 'Active' && (
                                  <span className="text-slate-400 font-bold font-mono text-[10px] bg-slate-200/50 px-1.5 py-0.5 rounded">
                                    ~{alloc.etaMinutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Nearby Help Points */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Nearest Support & Relief Points</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lookupData.nearbyDepots.map((depot) => (
                <div key={depot.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">{depot.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {depot.district} • <span className="text-sky-750">{depot.distanceKm} km away</span>
                    </p>
                  </div>

                  <div className="space-y-3.5 border-t border-slate-50 pt-3">
                    {depot.resources.map((res, idx) => {
                      const pct = res.total > 0 ? (res.available / res.total) * 100 : 0;
                      let barColor = 'bg-emerald-500';
                      let barBg = 'bg-emerald-50';
                      if (pct <= 50 && pct >= 10) {
                        barColor = 'bg-amber-500';
                        barBg = 'bg-amber-50';
                      } else if (pct < 10) {
                        barColor = 'bg-rose-500';
                        barBg = 'bg-rose-50';
                      }

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-slate-600 flex items-center gap-1">
                              {res.type === 'Shelter Space' ? <Home className="w-3.5 h-3.5 text-slate-400" /> : <Utensils className="w-3.5 h-3.5 text-slate-400" />}
                              <span>{res.type}s</span>
                            </span>
                            <span className="font-bold text-slate-700">
                              {res.available} / {res.total} available
                            </span>
                          </div>
                          
                          {/* Availability capacity bar */}
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Search Prompts / Empty State */}
      {!loading && !resolvedCoords && (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto border border-sky-100">
            <Search className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">Is help reaching your area?</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
              Enter your Tamil Nadu district name above, or tap "Use my current location" to check emergency response operations and available relief depots near you.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-2 max-w-sm mx-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Or select from active sectors:</span>
            <div className="flex flex-wrap justify-center gap-2">
              {['Chennai', 'Coimbatore', 'Trichy', 'Madurai', 'Nilgiris', 'Cuddalore', 'Salem'].map((name) => (
                <button
                  key={name}
                  onClick={() => selectDistrict(name)}
                  className="bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-slate-150 hover:border-sky-200"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Citizen Request Form Toggle Button */}
      {resolvedCoords && !showReportForm && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setShowReportForm(true)}
            className="w-full bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-sm py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Request Assistance / Log Incident In This Area</span>
          </button>
        </div>
      )}

      {/* Citizen Request Form Render */}
      {showReportForm && (
        <div className="pt-2 animate-slideUp">
          <IncidentReportForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowReportForm(false)}
            isCitizen={true}
            initialLat={resolvedCoords?.lat.toFixed(4)}
            initialLng={resolvedCoords?.lng.toFixed(4)}
            initialDistrict={resolvedLocationName.includes('Location') ? findClosestDistrict(resolvedCoords.lat, resolvedCoords.lng).name : resolvedLocationName}
          />
        </div>
      )}

    </div>
  );
}
