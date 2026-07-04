import React, { useState } from 'react';
import { Incident, DisasterType, SeverityLabel, IncidentSource } from '../types.js';
import { AlertCircle, Plus, RefreshCw, Radio, Flame, ShieldAlert, Waves, Mountain, Wind, ShieldX } from 'lucide-react';
import IncidentReportForm from './IncidentReportForm.tsx';

interface IncidentQueueProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  onAddManualIncident: (incidentData: any) => void;
  onToggleSimulation: () => void;
  onResetDatabase: () => void;
  simulationActive: boolean;
  disasterFilter: string;
  severityFilter: string;
}

export default function IncidentQueue({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onAddManualIncident,
  onToggleSimulation,
  onResetDatabase,
  simulationActive,
  disasterFilter,
  severityFilter,
}: IncidentQueueProps) {
  const [showForm, setShowForm] = useState(false);

  // Filters mapping
  const filteredIncidents = incidents.filter(inc => {
    const matchesDisaster = disasterFilter === 'All' || inc.disasterType === disasterFilter;
    const matchesSeverity = severityFilter === 'All' || inc.severityLabel === severityFilter;
    return matchesDisaster && matchesSeverity;
  }).sort((a, b) => b.severityScore - a.severityScore); // Rank highest severity score on top

  const getDisasterIcon = (type: DisasterType) => {
    switch (type) {
      case 'Flood': return <Waves className="w-4 h-4 text-sky-400" />;
      case 'Cyclone': return <Wind className="w-4 h-4 text-teal-400" />;
      case 'Earthquake': return <Radio className="w-4 h-4 text-purple-400" />;
      case 'Fire': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Landslide': return <Mountain className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div id="incident-queue-container" className="flex flex-col h-full bento-card p-5 overflow-hidden">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Incident Priority Queue</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Ranked dynamically by severity scoring weights</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulation}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
              simulationActive
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{simulationActive ? 'Simulation Active' : 'Live Feed Sim'}</span>
          </button>

          {/* Manual Input Trigger */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Manual Report Dropdown Form */}
      {showForm && (
        <IncidentReportForm
          onSubmit={(incidentData) => {
            onAddManualIncident(incidentData);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Incidents Queue Scroller */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
            <ShieldX className="w-10 h-10 mb-2 opacity-55 text-slate-600" />
            <p className="text-xs">No active incidents matching filters.</p>
          </div>
        ) : (
          filteredIncidents.map(inc => {
            const isSelected = inc.id === selectedIncidentId;
            let badgeStyle = 'text-green-400 bg-green-500/10 border-green-500/20';
            if (inc.severityLabel === 'Medium') badgeStyle = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            if (inc.severityLabel === 'High') badgeStyle = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            if (inc.severityLabel === 'Critical') badgeStyle = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            
            if (inc.status === 'Resolved') {
              badgeStyle = 'text-slate-400 bg-slate-500/10 border-slate-500/20 line-through';
            }

            return (
              <div
                key={inc.id}
                id={`incident-item-${inc.id}`}
                onClick={() => onSelectIncident(isSelected ? null : inc.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-sky-400/80 shadow-md shadow-sky-500/10 glow-accent'
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Priority ribbon or badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getDisasterIcon(inc.disasterType)}
                    <span className="text-xs font-bold text-white">{inc.district} - {inc.disasterType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                      {inc.severityLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Score: {inc.severityScore}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-normal line-clamp-2">
                  {inc.description}
                </p>

                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500 font-medium">
                  <span>Affected: <span className="font-bold text-slate-300">{inc.peopleAffected}</span></span>
                  <span>Source: <span className="text-slate-400 font-mono">{inc.source}</span></span>
                  <span className={`font-bold ${inc.status === 'Resolved' ? 'text-emerald-500' : inc.status === 'Active' ? 'text-sky-400' : 'text-amber-500'}`}>
                    {inc.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reset DB Button */}
      <div className="border-t border-slate-800 pt-4 mt-3 flex justify-between items-center">
        <span className="text-[9px] text-slate-500 font-mono">Seeded Defaults: 35 Reports</span>
        <button
          onClick={onResetDatabase}
          className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors font-bold"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Command DB</span>
        </button>
      </div>
    </div>
  );
}
