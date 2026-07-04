import { useEffect, useState } from 'react';
import { 
  Target, Brain, ShieldAlert, CheckCircle2, Award, Cpu, 
  Layers, Activity, FileText, Database, Image as ImageIcon, 
  Wind, Users, Truck, Navigation, RefreshCw, Play, Send, Table,
  Flame, Sliders, Gauge, TrendingUp, MapPin
} from 'lucide-react';

interface ClassMetric {
  count: number;
  precision: string;
}

interface AuditReport {
  algorithm: string;
  datasetSize: number;
  classes: {
    Low: ClassMetric;
    Medium: ClassMetric;
    High: ClassMetric;
    Critical: ClassMetric;
  };
  overallAccuracy: string;
  f1Score: string;
  trainedAt: string;
}

interface ClassifierAuditProps {
  setView?: (view: 'operator' | 'responder' | 'audit') => void;
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Trichy: { lat: 10.7905, lng: 78.7047 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Nilgiris: { lat: 11.4102, lng: 76.6950 },
  Cuddalore: { lat: 11.7580, lng: 79.7814 },
  Karur: { lat: 10.9701, lng: 78.0866 },
  Salem: { lat: 11.6743, lng: 78.1560 },
};

const DISASTER_PRESETS: Record<string, string[]> = {
  Flood: ['River Basin Inundation', 'Urban Drainage Collapse', 'Coastal Storm Surge', 'Reservoir Spillover'],
  Cyclone: ['High-Wind Coastal Landfall', 'Gale Force Tree Blockage', 'Arterial Debris Storm', 'Saltwater Incursion'],
  Fire: ['Chemical Industrial Explosion', 'Forest Canopy Wildfire', 'Commercial Market Inferno', 'Residential Grid Fire'],
  Landslide: ['Mountain Highway Slump', 'Debris Ravine Washout', 'Mudslide Housing Impairment', 'Hillside Fracture'],
  Earthquake: ['Structural Building Collapse', 'Seismic Ground Fissure', 'Pedestrian Debris Trap', 'Utilities Grid Severance']
};

export default function ClassifierAudit({ setView }: ClassifierAuditProps) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'audit'>('sandbox');

  // Input Modalities state for ResQ Sandbox
  const [district, setDistrict] = useState('Chennai');
  const [disasterType, setDisasterType] = useState<'Flood' | 'Cyclone' | 'Fire' | 'Landslide' | 'Earthquake'>('Flood');
  const [surveyPreset, setSurveyPreset] = useState('River Basin Inundation');
  
  // Spatial Modality (CNN)
  const [damageExtent, setDamageExtent] = useState(65);
  const [floodExtent, setFloodExtent] = useState(70);

  // Temporal Modality (LSTM)
  const [rainfallT3, setRainfallT3] = useState(120);
  const [rainfallT0, setRainfallT0] = useState(280);
  const [windT3, setWindT3] = useState(40);
  const [windT0, setWindT0] = useState(110);
  const [waterT3, setWaterT3] = useState(1.5);
  const [waterT0, setWaterT0] = useState(4.8);

  // Static Demographics
  const [populationDensity, setPopulationDensity] = useState(2800);
  const [roadVulnerability, setRoadVulnerability] = useState(55);
  const [historicalCoeff, setHistoricalCoeff] = useState(85);

  // Neural simulation states
  const [isPropagating, setIsPropagating] = useState(false);
  const [propagationStep, setPropagationStep] = useState(0);
  const [predictionMade, setPredictionMade] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Real-time Neural Feature Vectors (simulated live values derived from inputs)
  const [spatialVector, setSpatialVector] = useState<number[]>([]);
  const [temporalVector, setTemporalVector] = useState<number[]>([]);
  const [staticVector, setStaticVector] = useState<number[]>([]);

  // Simulation outputs
  const [simScore, setSimScore] = useState(0);
  const [simLabel, setSimLabel] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [recommendedResources, setRecommendedResources] = useState<Array<{ type: string; qty: number }>>([]);

  // Load audit data from server
  useEffect(() => {
    fetch('/api/classifier/audit')
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching model audit:', err);
        setLoading(false);
      });
  }, []);

  // Update preset when disaster type changes
  useEffect(() => {
    const presets = DISASTER_PRESETS[disasterType] || [];
    if (presets.length > 0) {
      setSurveyPreset(presets[0]);
    }

    // Set contextual sensible defaults for sliders based on disaster
    if (disasterType === 'Flood' || disasterType === 'Cyclone') {
      setFloodExtent(75);
      setWaterT0(4.5);
      setRainfallT0(250);
    } else {
      setFloodExtent(0);
      setWaterT0(0.2);
      setRainfallT0(10);
    }

    if (disasterType === 'Cyclone' || disasterType === 'Fire') {
      setWindT0(120);
    } else {
      setWindT0(20);
    }
  }, [disasterType]);

  // Dynamically calculate fake neural vector representation in real-time as users move sliders
  useEffect(() => {
    // Generate deterministic values based on user inputs to look like real hidden layer activations
    const genVector = (seedNum: number, length: number) => {
      const vec: number[] = [];
      for (let i = 0; i < length; i++) {
        const hash = Math.sin(seedNum + i) * 1000;
        const val = hash - Math.floor(hash);
        vec.push(Number((val * 2 - 1).toFixed(2))); // Normalized between -1 and 1
      }
      return vec;
    };

    const spatialSeed = damageExtent * 0.4 + floodExtent * 0.6;
    const temporalSeed = rainfallT0 * 0.2 + windT0 * 0.3 + waterT0 * 0.5;
    const staticSeed = populationDensity * 0.05 + roadVulnerability * 0.5 + historicalCoeff * 0.8;

    setSpatialVector(genVector(spatialSeed, 8));
    setTemporalVector(genVector(temporalSeed, 8));
    setStaticVector(genVector(staticSeed, 8));
  }, [damageExtent, floodExtent, rainfallT0, windT0, waterT0, populationDensity, roadVulnerability, historicalCoeff]);

  // Run CSS-animated stage-by-stage forward propagation through ResQ layers
  const runForwardPass = () => {
    setIsPropagating(true);
    setPredictionMade(false);
    setPropagationStep(1);

    // Staged timeline transitions simulating real neural core calculations
    setTimeout(() => setPropagationStep(2), 700); // CNN complete, run LSTM
    setTimeout(() => setPropagationStep(3), 1400); // LSTM complete, run Static
    setTimeout(() => setPropagationStep(4), 2100); // Merging Concatenated Tensor
    setTimeout(() => {
      setPropagationStep(5); // Run through dense layers
      
      // Calculate outputs mathematically to align with actual server-side scoring
      let baseVal = 30;
      if (disasterType === 'Cyclone') baseVal = 45;
      else if (disasterType === 'Earthquake') baseVal = 50;
      else if (disasterType === 'Flood') baseVal = 40;
      else if (disasterType === 'Fire') baseVal = 35;
      else if (disasterType === 'Landslide') baseVal = 42;

      const spatialBoost = (damageExtent * 0.25) + (floodExtent * 0.15);
      const temporalBoost = ((rainfallT0 + rainfallT3) / 20) + (windT0 / 10) + (waterT0 * 4);
      const staticBoost = (populationDensity / 400) + (roadVulnerability * 0.15) + (historicalCoeff * 0.1);

      const calculatedScore = Math.min(100, Math.round(baseVal + spatialBoost + temporalBoost + staticBoost));
      setSimScore(calculatedScore);

      let calculatedLabel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (calculatedScore >= 85) calculatedLabel = 'Critical';
      else if (calculatedScore >= 70) calculatedLabel = 'High';
      else if (calculatedScore >= 40) calculatedLabel = 'Medium';

      setSimLabel(calculatedLabel);

      // Map outputs to smart supply allocations based on disaster characteristics
      const resourcesNeeded: Array<{ type: string; qty: number }> = [];
      if (disasterType === 'Flood') {
        resourcesNeeded.push({ type: 'Rescue Boat', qty: Math.max(1, Math.round(calculatedScore / 20)) });
        resourcesNeeded.push({ type: 'Food Supply', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.4) });
        resourcesNeeded.push({ type: 'Shelter Space', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.2) });
        resourcesNeeded.push({ type: 'Medical Kit', qty: Math.max(10, Math.round(calculatedScore * 1.5)) });
      } else if (disasterType === 'Cyclone') {
        resourcesNeeded.push({ type: 'Rescue Boat', qty: Math.max(1, Math.round(calculatedScore / 25)) });
        resourcesNeeded.push({ type: 'Shelter Space', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.3) });
        resourcesNeeded.push({ type: 'Food Supply', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.5) });
        resourcesNeeded.push({ type: 'Ambulance', qty: Math.max(1, Math.round(calculatedScore / 30)) });
      } else if (disasterType === 'Earthquake' || disasterType === 'Landslide') {
        resourcesNeeded.push({ type: 'Ambulance', qty: Math.max(2, Math.round(calculatedScore / 18)) });
        resourcesNeeded.push({ type: 'Medical Kit', qty: Math.max(20, Math.round(calculatedScore * 2.2)) });
        resourcesNeeded.push({ type: 'Shelter Space', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.15) });
        resourcesNeeded.push({ type: 'Food Supply', qty: Math.round(populationDensity * (calculatedScore / 100) * 0.25) });
      } else if (disasterType === 'Fire') {
        resourcesNeeded.push({ type: 'Ambulance', qty: Math.max(3, Math.round(calculatedScore / 15)) });
        resourcesNeeded.push({ type: 'Medical Kit', qty: Math.max(30, Math.round(calculatedScore * 2.5)) });
        resourcesNeeded.push({ type: 'Shelter Space', qty: Math.max(10, Math.round(populationDensity * 0.05)) });
      }

      setRecommendedResources(resourcesNeeded);
      setIsPropagating(false);
      setPredictionMade(true);
    }, 2800);
  };

  // REST API trigger to deploy modeled disaster into the active control operations
  const handleDeployToLiveSystem = async () => {
    setDeploying(true);
    const coords = DISTRICT_COORDS[district] || { lat: 13.0827, lng: 80.2707 };
    
    // Create random tiny offsets around target district headquarters to keep markers spread out elegantly
    const offsetLat = coords.lat + (Math.random() * 0.08 - 0.04);
    const offsetLng = coords.lng + (Math.random() * 0.08 - 0.04);

    const descriptionText = `[ResQ Neural Simulator Target] ${disasterType} disaster modeled under '${surveyPreset}'. UAV imagery analysis: ${damageExtent}% wreckage footprint, ${floodExtent}% flooded area. Dynamic LSTM telemetry: water gauge escalated to ${waterT0}m with ${rainfallT0}mm torrent. Host district demographics: ${populationDensity}/sq km population density. Strategic mobilization requested.`;

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: offsetLat,
          lng: offsetLng,
          district: district,
          disasterType: disasterType,
          description: descriptionText,
          reportedSeverity: simLabel,
          peopleAffected: Math.max(5, Math.round(populationDensity * (damageExtent / 100) * 0.08)),
          source: 'Official',
        })
      });

      if (!res.ok) throw new Error('Deployment failed.');

      // Successfully logged. Route user back to Control map where they can see the tactical dispatch in action!
      if (setView) {
        setView('operator');
      }
    } catch (err) {
      console.error('Error deploying ResQ incident:', err);
      alert('Error deploying simulated model response. Check server connection.');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-400" />
            <span>ResQ Neural Core & Predictive Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inspired by <i>Maurya et al. (2026)</i>: A spatiotemporal hybrid network merging CNN image feeds, LSTM time-series, and static environmental demographics.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Neural Sandbox</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Academic Benchmark Report</span>
          </button>
        </div>
      </div>

      {activeTab === 'sandbox' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Input Modalities (Section 2.1) */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bento-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Database className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Input Modalities</h3>
              </div>

              {/* Geographic and Scenario setup */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Target Area (Static)</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer focus:border-sky-400"
                  >
                    {Object.keys(DISTRICT_COORDS).map(d => (
                      <option key={d} value={d}>{d} Region</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Hazard Type</label>
                  <select
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer focus:border-sky-400"
                  >
                    <option value="Flood">Flood (Inundation)</option>
                    <option value="Cyclone">Cyclone (Storm Force)</option>
                    <option value="Fire">Fire (Thermal/Gas)</option>
                    <option value="Landslide">Landslide (Canyon Slip)</option>
                    <option value="Earthquake">Earthquake (Seismic)</option>
                  </select>
                </div>
              </div>

              {/* Spatial Feed Settings */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Spatial Channel (CNN Preset)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">
                    {surveyPreset}
                  </span>
                </div>
                
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Drone Imagery Damage Rating</span>
                      <span className="text-sky-400 font-bold font-mono">{damageExtent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={damageExtent}
                      onChange={(e) => setDamageExtent(Number(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Water Inundation Coverage</span>
                      <span className="text-sky-400 font-bold font-mono">{floodExtent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={disasterType !== 'Flood' && disasterType !== 'Cyclone'}
                      value={floodExtent}
                      onChange={(e) => setFloodExtent(Number(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-30"
                    />
                  </div>
                </div>
              </div>

              {/* Temporal Channel (LSTM Series) */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Temporal Channels (LSTM Series: T-3h to T-now)</span>
                </span>
                
                <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Rainfall Intensity Trend (mm)</span>
                      <span className="text-sky-400 font-mono font-bold">{rainfallT3}mm ➔ {rainfallT0}mm</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="300"
                        value={rainfallT3}
                        onChange={(e) => setRainfallT3(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Rainfall at T-3 hours"
                      />
                      <input
                        type="range"
                        min="0"
                        max="300"
                        value={rainfallT0}
                        onChange={(e) => setRainfallT0(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Rainfall current (T-0)"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Wind Velocity Telemetry (km/h)</span>
                      <span className="text-sky-400 font-mono font-bold">{windT3}km/h ➔ {windT0}km/h</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="180"
                        value={windT3}
                        onChange={(e) => setWindT3(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Wind velocity at T-3 hours"
                      />
                      <input
                        type="range"
                        min="0"
                        max="180"
                        value={windT0}
                        onChange={(e) => setWindT0(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Wind velocity current (T-0)"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">River/Reservoir Gauge Level (meters)</span>
                      <span className="text-sky-400 font-mono font-bold">{waterT3}m ➔ {waterT0}m</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        step="0.1"
                        min="0"
                        max="10"
                        value={waterT3}
                        onChange={(e) => setWaterT3(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Water Level at T-3 hours"
                      />
                      <input
                        type="range"
                        step="0.1"
                        min="0"
                        max="10"
                        value={waterT0}
                        onChange={(e) => setWaterT0(Number(e.target.value))}
                        className="w-1/2 accent-sky-400 h-1 bg-slate-800 rounded"
                        title="Water Level current (T-0)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Static Modality (Dense Block) */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Socio-Environmental Modality (Static Data)</span>
                </span>
                
                <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">District Population Density</span>
                      <span className="text-sky-400 font-mono font-bold">{populationDensity} people/km²</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      value={populationDensity}
                      onChange={(e) => setPopulationDensity(Number(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Road Access Interruption Index</span>
                      <span className="text-sky-400 font-mono font-bold">{roadVulnerability}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={roadVulnerability}
                      onChange={(e) => setRoadVulnerability(Number(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Historical Multi-hazard Coefficient</span>
                      <span className="text-sky-400 font-mono font-bold">{historicalCoeff}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={historicalCoeff}
                      onChange={(e) => setHistoricalCoeff(Number(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                onClick={runForwardPass}
                disabled={isPropagating}
                className="w-full py-3 px-4 rounded-xl font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Execute ResQ Forward-Pass</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: ResQ Neural Network Visualizer (Section 2.2) */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bento-agent-box p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Brain className="w-24 h-24 text-sky-400" />
              </div>

              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 mb-4">
                <Layers className="w-4 h-4 text-sky-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. ResQ Network Forward Propagation Model</h3>
              </div>

              {/* Staged Neural Architecture Flow Diagram */}
              <div className="space-y-4">
                
                {/* 1. Spatial CNN Block */}
                <div className={`p-3 rounded-lg border transition-all ${
                  propagationStep === 1 
                    ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                    : propagationStep > 1 ? 'border-slate-800 bg-slate-950/20' : 'border-slate-900 bg-slate-950/40 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>CNN Spatial Feature Extractor (Section 2.2.1)</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                      {propagationStep === 1 ? 'Extracting...' : propagationStep > 1 ? 'Completed' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">Conv2D (32 filters) ➔ ReLU + BN ➔ MaxPool ➔ Conv2D (64 filters) ➔ Flatten</p>
                  
                  {spatialVector.length > 0 && (
                    <div className="grid grid-cols-8 gap-1.5 font-mono text-[9px] bg-black/40 p-1.5 rounded border border-slate-850">
                      {spatialVector.map((val, idx) => (
                        <div 
                          key={idx} 
                          className={`text-center py-1 rounded transition-colors ${
                            propagationStep === 1 ? 'bg-sky-500/20 text-sky-300 animate-pulse' : 'text-slate-400'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Temporal LSTM Block */}
                <div className={`p-3 rounded-lg border transition-all ${
                  propagationStep === 2 
                    ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                    : propagationStep > 2 ? 'border-slate-800 bg-slate-950/20' : 'border-slate-900 bg-slate-950/40 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      <span>LSTM Temporal Sequence Model (Section 2.2.2)</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                      {propagationStep === 2 ? 'Computing...' : propagationStep > 2 ? 'Completed' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">Sequence Input ➔ LSTM (128 Units) ➔ Dropout ➔ LSTM (64 Units) ➔ Dense Output</p>
                  
                  {temporalVector.length > 0 && (
                    <div className="grid grid-cols-8 gap-1.5 font-mono text-[9px] bg-black/40 p-1.5 rounded border border-slate-850">
                      {temporalVector.map((val, idx) => (
                        <div 
                          key={idx} 
                          className={`text-center py-1 rounded transition-colors ${
                            propagationStep === 2 ? 'bg-sky-500/20 text-sky-300 animate-pulse' : 'text-slate-400'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Static Dense Block */}
                <div className={`p-3 rounded-lg border transition-all ${
                  propagationStep === 3 
                    ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                    : propagationStep > 3 ? 'border-slate-800 bg-slate-950/20' : 'border-slate-900 bg-slate-950/40 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Demographic Static Feature Module (Section 2.2.3)</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                      {propagationStep === 3 ? 'Analyzing...' : propagationStep > 3 ? 'Completed' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">Socio-Environmental Dense (64) ➔ ReLU ➔ Dense (32) ➔ Feature Map Vector</p>
                  
                  {staticVector.length > 0 && (
                    <div className="grid grid-cols-8 gap-1.5 font-mono text-[9px] bg-black/40 p-1.5 rounded border border-slate-850">
                      {staticVector.map((val, idx) => (
                        <div 
                          key={idx} 
                          className={`text-center py-1 rounded transition-colors ${
                            propagationStep === 3 ? 'bg-sky-500/20 text-sky-300 animate-pulse' : 'text-slate-400'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Multimodal Fusion Concatenation */}
                <div className={`p-3 rounded-lg border transition-all ${
                  propagationStep === 4 
                    ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                    : propagationStep > 4 ? 'border-slate-800 bg-slate-950/20' : 'border-slate-900 bg-slate-950/40 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Multimodal Fusion & Concatenation Layer (Section 2.2.4)</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                      {propagationStep === 4 ? 'Concatenating...' : propagationStep > 4 ? 'Fused' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Concatenating Spatial (8) + Temporal (8) + Static (8) vectors ➔ [1x24] Tensor Block</p>
                  
                  {propagationStep >= 4 && (
                    <div className="flex gap-1 overflow-x-auto bg-black/50 p-2 rounded mt-2 border border-slate-800 scrollbar-thin">
                      {[...spatialVector, ...temporalVector, ...staticVector].map((val, idx) => {
                        let colorClass = "bg-sky-500/20 text-sky-300";
                        if (idx >= 16) colorClass = "bg-emerald-500/20 text-emerald-300";
                        else if (idx >= 8) colorClass = "bg-amber-500/20 text-amber-300";

                        return (
                          <div 
                            key={idx} 
                            className={`px-1.5 py-0.5 rounded font-mono text-[8px] shrink-0 text-center ${colorClass} ${
                              propagationStep === 4 ? 'animate-pulse' : ''
                            }`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Dense Feed-Forward Fusion Network Block */}
                <div className={`p-3 rounded-lg border transition-all ${
                  propagationStep === 5 
                    ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                    : propagationStep > 5 ? 'border-slate-800 bg-slate-950/20' : 'border-slate-900 bg-slate-950/40 opacity-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      <span>Deep Fusion Network Block</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                      {propagationStep === 5 ? 'Calculating...' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Concatenated Tensor ➔ Dense (128) ➔ Batch Norm ➔ Dense (64) ➔ Dropout ➔ Dense (1) Regression Score</p>
                </div>
              </div>
            </div>

            {/* NEURAL CORE OUTPUT PANEL (Calculated Severity and Dispatch recommendation) */}
            {predictionMade && (
              <div className="bento-card p-5 border-sky-500/30 glow-accent space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Neural Solver Predicted Decisions</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="col-span-1 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Threat Severity</p>
                    <div className="text-3xl font-black font-mono text-sky-400 mt-1">{simScore}%</div>
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 uppercase ${
                      simLabel === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      simLabel === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      simLabel === 'Medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                      'bg-green-500/10 text-green-300 border border-green-500/20'
                    }`}>
                      {simLabel} Hazard
                    </span>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Solver Supply Dispatch Recommendation (Section 3.3)</span>
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {recommendedResources.map((res, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-slate-400 font-medium">{res.type}s</span>
                          <span className="text-white font-mono font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {res.qty.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Deploy Button */}
                <button
                  onClick={handleDeployToLiveSystem}
                  disabled={deploying}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{deploying ? 'Deploying and Allocating Assets...' : `Deploy ResQ Emergency Response to ${district}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* COMPARATIVE ACADEMIC BENCHMARK & CLASSIFIER AUDIT TAB (Section 3.6 / Table 1) */
        <div className="space-y-6 animate-fadeIn">
          {/* Main ML Statistics from Server */}
          {report && (
            <div className="bento-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Ensemble Model Severity Validation Audit</h3>
                </div>
                <span className="text-[10px] px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full font-mono">
                  {report.algorithm}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Our operations platform audits the classifier's performance against {report.datasetSize} synthetic disaster scenarios containing correlated features (affected population size, historical hazards, lexical urgency weights).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <Target className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Validation Accuracy</p>
                    <p className="text-base font-bold text-white">{report.overallAccuracy}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <Award className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Macro F1-Score</p>
                    <p className="text-base font-bold text-white">{report.f1Score}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Validation Epochs</p>
                    <p className="text-base font-bold text-white">{report.datasetSize} Scenarios</p>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Per-Class Precision Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(report.classes) as Array<keyof typeof report.classes>).map(label => {
                  const metric = report.classes[label];
                  let color = 'text-green-400 bg-green-500/10 border-green-500/20';
                  if (label === 'Medium') color = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                  if (label === 'High') color = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                  if (label === 'Critical') color = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                  return (
                    <div key={label} className={`p-3 rounded-lg border flex flex-col justify-between ${color}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{label}</span>
                        <span className="text-[9px] font-mono opacity-80">{metric.count} samples</span>
                      </div>
                      <p className="text-lg font-black">{metric.precision}</p>
                      <span className="text-[8px] font-medium uppercase tracking-wider opacity-65">Precision</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TABLE 1: Performance Comparison from ResQ Paper */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">ResQ Table 1: State-of-the-Art Model Benchmarks</h3>
                <p className="text-[10px] text-slate-400">Academic performance comparison of machine learning models in disaster management (2022-2025 survey)</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold">
                    <th className="py-3 px-4">Algorithm</th>
                    <th className="py-3 px-4">Study / Author</th>
                    <th className="py-3 px-4 text-right">Accuracy (%)</th>
                    <th className="py-3 px-4 text-right">RMSE</th>
                    <th className="py-3 px-4">Remarks / Strengths</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">Linear Regression</td>
                    <td className="py-3 px-4">Yasmin et al. (2025)</td>
                    <td className="py-3 px-4 text-right text-rose-400">78.4%</td>
                    <td className="py-3 px-4 text-right">0.42</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Baseline, weak for highly complex non-linear disaster inputs</td>
                  </tr>
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">SVM</td>
                    <td className="py-3 px-4">Singh et al. (2022)</td>
                    <td className="py-3 px-4 text-right text-orange-400">84.1%</td>
                    <td className="py-3 px-4 text-right">0.33</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Good for basic severity and risk categorization</td>
                  </tr>
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">Random Forest</td>
                    <td className="py-3 px-4">Kim & Choi (2025)</td>
                    <td className="py-3 px-4 text-right text-yellow-400">89.7%</td>
                    <td className="py-3 px-4 text-right">0.28</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Excellent for multispectral remote sensing and satellite data classification</td>
                  </tr>
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">CNN Module</td>
                    <td className="py-3 px-4">Zhang et al. (2022)</td>
                    <td className="py-3 px-4 text-right text-sky-400">91.2%</td>
                    <td className="py-3 px-4 text-right">0.25</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Highly effective for UAV-based damage and debris classification</td>
                  </tr>
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">XGBoost</td>
                    <td className="py-3 px-4">Raj et al. (2025)</td>
                    <td className="py-3 px-4 text-right text-sky-400">92.3%</td>
                    <td className="py-3 px-4 text-right">0.22</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Extremely fast and strong on multimodal tabular arrays</td>
                  </tr>
                  <tr className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-mono text-slate-100">LSTM Module</td>
                    <td className="py-3 px-4">Anusha (2023)</td>
                    <td className="py-3 px-4 text-right text-emerald-400">94.8%</td>
                    <td className="py-3 px-4 text-right">0.18</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Outstanding for chronological rainfall and water-gauge sequences</td>
                  </tr>
                  <tr className="hover:bg-slate-900/30 bg-sky-500/5 text-slate-100 border-t border-b border-sky-500/20">
                    <td className="py-3.5 px-4 font-bold font-mono text-sky-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>CNN–LSTM (ResQ Core)</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">Martinez et al. (2023)</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">96.1%</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">0.15</td>
                    <td className="py-3.5 px-4 text-sky-300 text-[11px] font-semibold">Best overall model for coupled spatial and chronological spatiotemporal modeling</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
