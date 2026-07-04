import { useEffect, useRef, useState } from 'react';
import StatsBar from './components/StatsBar.tsx';
import DisasterMap from './components/DisasterMap.tsx';
import IncidentQueue from './components/IncidentQueue.tsx';
import AllocationDetails from './components/AllocationDetails.tsx';
import FieldResponder from './components/FieldResponder.tsx';
import ClassifierAudit from './components/ClassifierAudit.tsx';
import FloatingLettersBackground from './components/FloatingLettersBackground.tsx';
import PublicTracker from './components/PublicTracker.tsx';
import { Incident, Depot, Resource, Allocation, AgentNarrative, AppStats } from './types.js';
import { ShieldAlert, AlertTriangle, Radio, BarChart3, HardHat, RefreshCw, Activity, Cpu } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'operator' | 'responder' | 'audit' | 'public'>('operator');

  // App State variables
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [agentNarrative, setAgentNarrative] = useState<AgentNarrative | null>(null);
  const [stats, setStats] = useState<AppStats>({
    totalIncidents: 0,
    pendingIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    totalResources: 0,
    deployedResources: 0,
    avgResponseEta: 0,
    unmetNeedCount: 0,
  });
  const [simulationActive, setSimulationActive] = useState(false);

  // Filter terms
  const [disasterFilter, setDisasterFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // REST API Loader as bootstrap and fallback
  const fetchStateRest = async () => {
    try {
      const res = await fetch('/api/state');
      const payload = await res.json();
      setIncidents(payload.incidents || []);
      setDepots(payload.depots || []);
      setResources(payload.resources || []);
      setAllocations(payload.allocations || []);
      setAgentNarrative(payload.agentNarrative);
      setStats(payload.stats);
    } catch (err) {
      console.error('Error fetching state from REST API:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup Full-Duplex WebSockets
  useEffect(() => {
    fetchStateRest();

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to Disaster Control WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to real-time disaster broadcast server.');
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'STATE_UPDATE') {
            const { incidents, depots, resources, allocations, agentNarrative, stats, simulationActive } = message.data;
            setIncidents(incidents || []);
            setDepots(depots || []);
            setResources(resources || []);
            setAllocations(allocations || []);
            setAgentNarrative(agentNarrative);
            setStats(stats);
            setSimulationActive(simulationActive);
          }
        } catch (err) {
          console.error('Failed to parse socket broadcast state:', err);
        }
      };

      socket.onclose = () => {
        console.warn('Disaster command socket disconnected. Reconnecting in 5 seconds...');
        setWsConnected(false);
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Dispatch message wrappers
  const triggerOptimization = () => {
    if (socketRef.current && wsConnected) {
      socketRef.current.send(JSON.stringify({ type: 'OPTIMIZE' }));
    } else {
      fetch('/api/optimize', { method: 'POST' }).then(() => fetchStateRest());
    }
  };

  const addManualIncident = async (incidentData: any) => {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData),
      });
      if (!res.ok) throw new Error('Failed to log report.');
      // REST handles auto optimization, WebSocket will broadcast the fresh state
    } catch (err) {
      console.error(err);
    }
  };

  const resolveIncident = (incidentId: string, responder: string) => {
    if (socketRef.current && wsConnected) {
      socketRef.current.send(JSON.stringify({
        type: 'RESOLVE_INCIDENT',
        data: { incidentId, responder }
      }));
    }
  };

  const toggleSimulation = () => {
    if (socketRef.current && wsConnected) {
      socketRef.current.send(JSON.stringify({ type: 'TOGGLE_SIMULATION' }));
    }
  };

  const resetDatabase = () => {
    if (socketRef.current && wsConnected) {
      socketRef.current.send(JSON.stringify({ type: 'RESET' }));
    } else {
      fetch('/api/reset', { method: 'POST' }).then(() => fetchStateRest());
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
        <h2 className="text-white text-lg font-bold tracking-tight">AI Disaster Command Center</h2>
        <p className="text-slate-500 text-xs mt-1">Acquiring real-time command telemetry...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-all duration-300 ${
      view === 'public'
        ? 'bg-sky-50 text-slate-800'
        : 'bg-slate-950 text-slate-100'
    }`}>
      {view !== 'public' && <FloatingLettersBackground />}
      {/* Dynamic Alert Banner */}
      {view !== 'public' && stats.unmetNeedCount > 0 && (
        <div className="bg-rose-950/40 border-b border-rose-900/50 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
            <span>
              <strong>CRITICAL WARNING:</strong> Current resources are insufficient. Deficit of <strong>{stats.unmetNeedCount} units</strong> detected across active Tamil Nadu hazard zones.
            </span>
          </div>
          <button
            onClick={triggerOptimization}
            className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 px-3 py-1 rounded-md font-bold transition-all text-[10px]"
          >
            Solve Allocation Proximity
          </button>
        </div>
      )}

      {/* Main Command Header */}
      <header className={`border-b px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-[1001] transition-all duration-300 ${
        view === 'public'
          ? 'border-sky-100 bg-white/95 text-slate-800 backdrop-blur-md shadow-sm'
          : 'border-slate-900 bg-slate-950/85 text-slate-100 backdrop-blur-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
            view === 'public'
              ? 'bg-sky-100 border border-sky-200 text-sky-700'
              : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
          }`}>
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className={`text-base font-black uppercase tracking-tight flex items-center gap-2 ${
              view === 'public' ? 'text-slate-850' : 'text-white'
            }`}>
              <span>AI Disaster Response & Resource Allocation Agent</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-[10px] text-slate-500 font-mono">
                {wsConnected ? 'Live Connection Secured' : 'REST Fallback Activated'}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">TNSDMA Decision Support System</span>
            </div>
          </div>
        </div>

        {/* View Selection & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation Tabs */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 transition-all ${
            view === 'public'
              ? 'bg-slate-100 border-slate-200 shadow-inner'
              : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setView('operator')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                view === 'operator'
                  ? view === 'public'
                    ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md'
                  : view === 'public'
                    ? 'text-slate-550 hover:text-slate-800'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Control Room</span>
            </button>
            <button
              onClick={() => setView('responder')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                view === 'responder'
                  ? view === 'public'
                    ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md'
                  : view === 'public'
                    ? 'text-slate-550 hover:text-slate-800'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Field Responder</span>
            </button>
            <button
              onClick={() => setView('audit')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                view === 'audit'
                  ? view === 'public'
                    ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md'
                  : view === 'public'
                    ? 'text-slate-550 hover:text-slate-800'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>ML Classifier Audit</span>
            </button>
            <button
              onClick={() => setView('public')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                view === 'public'
                  ? 'bg-gradient-to-r from-sky-600 to-teal-650 text-white shadow-md'
                  : 'text-sky-400 hover:text-sky-300 border border-dashed border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5'
              }`}
            >
              <span>🧭 For Citizens</span>
            </button>
          </div>

          {/* Quick Solver Trigger */}
          {view !== 'public' && (
            <button
              onClick={triggerOptimization}
              className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 flex items-center justify-center transition-all shadow cursor-pointer"
              title="Recalculate Allocations"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-6 space-y-6 relative z-10">
        {view === 'operator' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats Summary Panel */}
            <StatsBar stats={stats} />

            {/* Live Operations Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              {/* Incident Priority Queue Panel */}
              <div className="lg:col-span-5 h-[500px] lg:h-[550px]">
                <IncidentQueue
                  incidents={incidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  onAddManualIncident={addManualIncident}
                  onToggleSimulation={toggleSimulation}
                  onResetDatabase={resetDatabase}
                  simulationActive={simulationActive}
                  disasterFilter={disasterFilter}
                  severityFilter={severityFilter}
                />
              </div>

              {/* Leaflet Map Panel */}
              <div className="lg:col-span-7 h-[500px] lg:h-[550px]">
                <DisasterMap
                  incidents={incidents}
                  depots={depots}
                  allocations={allocations}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  disasterFilter={disasterFilter}
                  setDisasterFilter={setDisasterFilter}
                  severityFilter={severityFilter}
                  setSeverityFilter={setSeverityFilter}
                />
              </div>
            </div>

            {/* Allocations and Narrative Panel */}
            <div className="min-h-[300px]">
              <AllocationDetails
                allocations={allocations}
                incidents={incidents}
                depots={depots}
                resources={resources}
                agentNarrative={agentNarrative}
                selectedIncidentId={selectedIncidentId}
                onSelectIncident={setSelectedIncidentId}
                triggerOptimization={triggerOptimization}
              />
            </div>
          </div>
        )}

        {view === 'responder' && (
          <div className="animate-fadeIn min-h-[550px]">
            <FieldResponder
              incidents={incidents}
              allocations={allocations}
              depots={depots}
              resources={resources}
              onResolveIncident={resolveIncident}
            />
          </div>
        )}

        {view === 'audit' && (
          <div className="animate-fadeIn">
            <ClassifierAudit setView={setView} />
          </div>
        )}

        {view === 'public' && (
          <div className="animate-fadeIn">
            <PublicTracker
              onAddManualIncident={addManualIncident}
              incidents={incidents}
              allocations={allocations}
              depots={depots}
              resources={resources}
            />
          </div>
        )}
      </main>

      <footer className={`border-t px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono mt-auto relative z-10 transition-all duration-300 ${
        view === 'public'
          ? 'border-sky-100 bg-white/40 text-slate-400'
          : 'border-slate-900 bg-slate-950/40 text-slate-500'
      }`}>
        <span>© 2026 Tamil Nadu State Disaster Management Authority</span>
        <span>Emergency Public Tracking System</span>
      </footer>
    </div>
  );
}
