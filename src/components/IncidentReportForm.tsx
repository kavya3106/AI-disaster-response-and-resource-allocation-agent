import React, { useState } from 'react';
import { DisasterType, SeverityLabel, IncidentSource } from '../types.js';

interface IncidentReportFormProps {
  onSubmit: (data: {
    district: string;
    lat: number;
    lng: number;
    disasterType: DisasterType;
    peopleAffected: number;
    reportedSeverity: SeverityLabel;
    source: IncidentSource;
    description: string;
  }) => void;
  onCancel: () => void;
  isCitizen?: boolean;
  initialLat?: string;
  initialLng?: string;
  initialDistrict?: string;
}

// District Lat/Lng Preset Mapper for ease of manual report entry
export const DISTRICT_PRESETS: Record<string, { lat: string, lng: string }> = {
  Chennai: { lat: '13.0827', lng: '80.2707' },
  Coimbatore: { lat: '11.0168', lng: '76.9558' },
  Trichy: { lat: '10.7905', lng: '78.7047' },
  Madurai: { lat: '9.9252', lng: '78.1198' },
  Nilgiris: { lat: '11.4102', lng: '76.6950' },
  Cuddalore: { lat: '11.7480', lng: '79.7714' },
  Karur: { lat: '10.9601', lng: '78.0766' },
  Salem: { lat: '11.6643', lng: '78.1460' },
};

export default function IncidentReportForm({
  onSubmit,
  onCancel,
  isCitizen = false,
  initialLat,
  initialLng,
  initialDistrict,
}: IncidentReportFormProps) {
  // Form fields state
  const [district, setDistrict] = useState(initialDistrict || 'Chennai');
  const [lat, setLat] = useState(initialLat || '13.0827');
  const [lng, setLng] = useState(initialLng || '80.2707');
  const [disasterType, setDisasterType] = useState<DisasterType>('Flood');
  const [peopleAffected, setPeopleAffected] = useState(25);
  const [reportedSeverity, setReportedSeverity] = useState<SeverityLabel>('High');
  const [source, setSource] = useState<IncidentSource>('Citizen');
  const [description, setDescription] = useState('');

  const handleDistrictChange = (dist: string) => {
    setDistrict(dist);
    const preset = DISTRICT_PRESETS[dist];
    if (preset) {
      setLat(preset.lat);
      setLng(preset.lng);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onSubmit({
      district,
      lat: Number(lat),
      lng: Number(lng),
      disasterType,
      peopleAffected: Number(peopleAffected),
      reportedSeverity,
      source: isCitizen ? 'Citizen' : source,
      description,
    });
  };

  // Light theme styles for citizen, dark for operator command center
  const formBg = isCitizen
    ? 'bg-white border-sky-100 shadow-xl p-6 rounded-2xl border'
    : 'mb-4 p-4 rounded-xl border border-indigo-500/20 bg-slate-900/50 space-y-3';
  
  const headerText = isCitizen
    ? 'text-lg font-bold text-sky-850'
    : 'text-xs font-bold text-indigo-400 uppercase tracking-wide';
    
  const inputClass = isCitizen
    ? 'w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium'
    : 'w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white outline-none focus:border-indigo-500';

  const labelClass = isCitizen
    ? 'text-xs text-slate-500 font-bold uppercase block mb-1.5'
    : 'text-[10px] text-slate-400 font-bold uppercase block mb-1';

  const submitButtonClass = isCitizen
    ? 'w-full bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-sm py-3 rounded-xl font-bold transition-all shadow-lg shadow-sky-600/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
    : 'w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-lg font-bold shadow-lg shadow-indigo-600/20 cursor-pointer';

  return (
    <form onSubmit={handleSubmit} className={isCitizen ? `${formBg} space-y-4` : formBg}>
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <h4 className={headerText}>{isCitizen ? 'Request Assistance' : 'File Raw Incident Report'}</h4>
        <button
          type="button"
          onClick={onCancel}
          className={isCitizen ? 'text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer' : 'text-slate-400 hover:text-white text-xs cursor-pointer'}
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>District</label>
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className={inputClass}
          >
            {Object.keys(DISTRICT_PRESETS).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Disaster Hazard</label>
          <select
            value={disasterType}
            onChange={(e) => setDisasterType(e.target.value as DisasterType)}
            className={inputClass}
          >
            <option value="Flood">Flood</option>
            <option value="Cyclone">Cyclone</option>
            <option value="Earthquake">Tremor / Earthquake</option>
            <option value="Fire">Fire</option>
            <option value="Landslide">Landslide</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>People Affected (Est.)</label>
          <input
            type="number"
            value={peopleAffected}
            onChange={(e) => setPeopleAffected(Number(e.target.value))}
            className={inputClass}
            min="1"
          />
        </div>

        <div>
          <label className={labelClass}>Initial Severity</label>
          <select
            value={reportedSeverity}
            onChange={(e) => setReportedSeverity(e.target.value as SeverityLabel)}
            className={inputClass}
          >
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Citizens don't need to specify source, it's always Citizen */}
      {!isCitizen && (
        <div>
          <label className={labelClass}>Information Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as IncidentSource)}
            className={inputClass}
          >
            <option value="Citizen">Citizen Report</option>
            <option value="Official">Official Bulletin</option>
            <option value="Sensor">IOT/Satellite Sensor</option>
            <option value="News">News Media</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Lat Coordinate</label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Lng Coordinate</label>
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Disaster Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} h-20 resize-none`}
          placeholder={isCitizen ? "Describe the situation, location, and immediate needs..." : "e.g., Severe water logging in residential sector..."}
          required
        />
      </div>

      <button
        type="submit"
        className={submitButtonClass}
      >
        {isCitizen ? 'Submit Assistance Request' : 'Submit & Dispatch Assets'}
      </button>
    </form>
  );
}
