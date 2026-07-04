import { Incident, Allocation, AgentNarrative, Depot, Resource } from '../types.js';
import { ShieldAlert, BookOpen, Clock, HeartHandshake, Eye, CheckCircle2, Navigation, Globe, AlertTriangle } from 'lucide-react';

interface AllocationDetailsProps {
  allocations: Allocation[];
  incidents: Incident[];
  depots: Depot[];
  resources: Resource[];
  agentNarrative: AgentNarrative | null;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  triggerOptimization: () => void;
}

export default function AllocationDetails({
  allocations,
  incidents,
  depots,
  resources,
  agentNarrative,
  selectedIncidentId,
  onSelectIncident,
  triggerOptimization,
}: AllocationDetailsProps) {

  // Group allocations for currently selected incident if there is one
  const selectedInc = incidents.find(i => i.id === selectedIncidentId);
  const selectedAllocations = selectedIncidentId 
    ? allocations.filter(a => a.incidentId === selectedIncidentId)
    : [];

  return (
    <div id="allocation-details-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Dossier: AI Reasoning Agent Narratives */}
      <div className="flex flex-col bento-agent-box p-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">AI Command Explanation</h3>
          </div>
          <button
            onClick={triggerOptimization}
            className="text-[10px] bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 px-2.5 py-1.5 rounded-lg font-bold transition-all"
          >
            Run AI Solver
          </button>
        </div>

        {agentNarrative ? (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-slate-300 text-xs">
            {/* Situation Overview */}
            {agentNarrative.situationOverview && (
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[10px]">
                  <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  <span>Executive Situation Overview</span>
                </div>
                <p className="leading-relaxed text-slate-300 font-medium">
                  {agentNarrative.situationOverview}
                </p>
              </div>
            )}

            {/* Tactical Actions List */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[10px]">
                <Navigation className="w-3.5 h-3.5" />
                <span>Tactical Dispatch Orders</span>
              </div>
              <ul className="space-y-1.5 pl-1.5 text-slate-300">
                {agentNarrative.actionPlan && agentNarrative.actionPlan.map((action, idx) => (
                  <li key={idx} className="flex gap-2 items-start leading-relaxed bg-slate-900/30 border border-slate-900/60 hover:border-slate-800 p-2.5 rounded-lg transition-all">
                    <span className="text-sky-500 font-bold mt-0.5">➔</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Regional Hazard Advisories */}
            {agentNarrative.regionalRisks && agentNarrative.regionalRisks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Regional Threat & Hazard Advisories</span>
                </div>
                <div className="space-y-1.5">
                  {agentNarrative.regionalRisks.map((risk, idx) => (
                    <div key={idx} className="leading-relaxed p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50 text-slate-400">
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization Justification */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Solver Trade-off Justification</span>
              </div>
              <p className="leading-relaxed text-slate-400 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                {agentNarrative.justification}
              </p>
            </div>

            {/* Resource Bottlenecks / Escalation */}
            {((agentNarrative as any).riskEscalation || (agentNarrative.resourceBottlenecks && agentNarrative.resourceBottlenecks.length > 0)) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider text-[10px]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Operational Deficits & Bottlenecks</span>
                </div>
                <div className="space-y-1.5">
                  {agentNarrative.resourceBottlenecks ? (
                    agentNarrative.resourceBottlenecks.map((bottleneck, idx) => {
                      const isCritical = bottleneck.includes('CRITICAL') || bottleneck.includes('BOTTLENECK') || bottleneck.includes('Shortages') || bottleneck.includes('deficit');
                      return (
                        <p key={idx} className={`p-3 rounded-lg border leading-relaxed ${
                          isCritical
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300 font-medium'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}>
                          {bottleneck}
                        </p>
                      );
                    })
                  ) : (
                    <p className={`p-3 rounded-lg border leading-relaxed ${
                      (agentNarrative as any).riskEscalation.includes('URGENT') || (agentNarrative as any).riskEscalation.includes('deficits')
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-300 font-medium'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}>
                      {(agentNarrative as any).riskEscalation}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="text-[9px] text-slate-500 font-mono text-right pt-2 border-t border-slate-800">
              Generated via Gemini Agent — {new Date(agentNarrative.generatedAt).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-50 text-sky-400" />
            <p className="text-xs">No active tactical plan computed.</p>
            <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Click "Run AI Solver" above to run the proximity constraints algorithm and generate explainable response plans.</p>
          </div>
        )}
      </div>

      {/* Dispatched Resource Logs Table */}
      <div className="flex flex-col bento-card p-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              {selectedIncidentId ? `${selectedInc?.district} Dispatches` : 'Active Dispatches & ETAs'}
            </h3>
          </div>
          {selectedIncidentId && (
            <button
              onClick={() => onSelectIncident(null)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto pr-1">
          {allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No resource dispatches recorded.</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Initialize solver to distribute ambulances, medical chests, and rescue boats.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="text-[10px] uppercase text-slate-500 tracking-wider border-b border-slate-900">
                <tr>
                  <th className="py-2">Resource</th>
                  <th className="py-2">Destination Zone</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">ETA</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {(selectedIncidentId ? selectedAllocations : allocations).map(alloc => {
                  const inc = incidents.find(i => i.id === alloc.incidentId);
                  const res = resources.find(r => r.id === alloc.resourceId);
                  const depot = depots.find(d => d.id === res?.depotId);

                  const isSelectedInc = alloc.incidentId === selectedIncidentId;

                  return (
                    <tr
                      key={alloc.id}
                      onClick={() => onSelectIncident(alloc.incidentId)}
                      className={`hover:bg-slate-900/30 cursor-pointer transition-colors ${
                        isSelectedInc ? 'bg-sky-500/10 text-white font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 max-w-[130px] truncate">
                        <p className="font-bold">{alloc.resourceType}</p>
                        <p className="text-[9px] text-slate-500 truncate">{depot?.name}</p>
                      </td>
                      <td className="py-2.5">
                        <p className="font-bold">{inc?.district}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{inc?.disasterType}</p>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-200">{alloc.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-sky-400 font-semibold">{alloc.etaMinutes}m</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold">
                          {alloc.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
