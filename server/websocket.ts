import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.js';
import { optimizeResourceAllocation } from './optimizer.js';
import { generateAgentNarrative } from './agent.js';
import { AppStats, Incident, DisasterType } from '../src/types.js';
import { classifySeverity } from './classifier.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

// List of realistic districts and locations in Tamil Nadu for live simulation
const SIM_SCENARIOS = [
  {
    district: 'Chennai',
    lat: 13.0600,
    lng: 80.2500,
    disasterType: 'Flood' as DisasterType,
    description: 'Adyar river banks breached near Jafferkhanpet. Ground level tenements flooded, 50 people seeking immediate boat evacuation.',
    reportedSeverity: 'High' as const,
    peopleAffected: 50,
    source: 'Citizen' as const,
  },
  {
    district: 'Nilgiris',
    lat: 11.4050,
    lng: 76.7000,
    disasterType: 'Landslide' as DisasterType,
    description: 'Soil slip near Ooty botanical gardens damaging 3 cottages. Occupants suspected trapped under roof tiling.',
    reportedSeverity: 'Critical' as const,
    peopleAffected: 8,
    source: 'Official' as const,
  },
  {
    district: 'Coimbatore',
    lat: 11.0200,
    lng: 76.9400,
    disasterType: 'Fire' as DisasterType,
    description: 'Scrap metal shop warehouse fire in Peetamedu. Spreading to dense commercial zone, smoke risk.',
    reportedSeverity: 'Medium' as const,
    peopleAffected: 25,
    source: 'News' as const,
  },
  {
    district: 'Cuddalore',
    lat: 11.7500,
    lng: 79.7600,
    disasterType: 'Cyclone' as DisasterType,
    description: 'Coastal winds peaking at 90 km/h. Roofs blown off coastal shelters in Devanampattinam. 120 people need emergency relocation.',
    reportedSeverity: 'High' as const,
    peopleAffected: 120,
    source: 'Official' as const,
  },
  {
    district: 'Trichy',
    lat: 10.8100,
    lng: 78.6900,
    disasterType: 'Flood' as DisasterType,
    description: 'Heavy seepage detected in Kollidam river barrage embankments. Lowlands adjacent to Srirangam on alert. 100 people vulnerable.',
    reportedSeverity: 'High' as const,
    peopleAffected: 100,
    source: 'Sensor' as const,
  },
  {
    district: 'Madurai',
    lat: 9.9200,
    lng: 78.1100,
    disasterType: 'Earthquake' as DisasterType,
    description: 'Tremor shakes vintage masonry brick buildings near Avani Moola street. Plaster falls and small crack lines reported. 15 affected.',
    reportedSeverity: 'Medium' as const,
    peopleAffected: 15,
    source: 'Citizen' as const,
  }
];

let simInterval: NodeJS.Timeout | null = null;
let simulationActive = false;

/**
 * Calculates current aggregate stats of the system
 */
export function calculateStats(): AppStats {
  const incidents = db.getIncidents();
  const resources = db.getResources();
  const allocations = db.getAllocations();

  const totalIncidents = incidents.length;
  const pendingIncidents = incidents.filter(i => i.status === 'Pending').length;
  const activeIncidents = incidents.filter(i => i.status === 'Active').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;

  const totalResources = resources.reduce((sum, r) => sum + r.total, 0);
  const deployedResources = resources.reduce((sum, r) => sum + r.allocated, 0);

  const avgResponseEta = allocations.length > 0
    ? Math.round(allocations.reduce((sum, a) => sum + a.etaMinutes, 0) / allocations.length)
    : 0;

  // Recalculate optimizer outputs to fetch exact unmet needs
  const depots = db.getDepots();
  const optResult = optimizeResourceAllocation(incidents, depots, resources);
  const unmetNeedCount = optResult.unmetNeeds.reduce((sum, un) => sum + un.missingQuantity, 0);

  return {
    totalIncidents,
    pendingIncidents,
    activeIncidents,
    resolvedIncidents,
    totalResources,
    deployedResources,
    avgResponseEta,
    unmetNeedCount,
  };
}

/**
 * Broadcasts a state payload containing all real-time tables to all connected users
 */
export function broadcastState() {
  if (!wss) return;

  const statePayload = {
    type: 'STATE_UPDATE',
    data: {
      incidents: db.getIncidents(),
      depots: db.getDepots(),
      resources: db.getResources(),
      allocations: db.getAllocations(),
      agentNarrative: db.getAgentNarrative(),
      stats: calculateStats(),
      simulationActive,
    }
  };

  const message = JSON.stringify(statePayload);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Runs the optimization routine, saves outputs, asks Gemini for narrative explanation, and broadcasts
 */
export async function triggerOptimization() {
  const incidents = db.getIncidents();
  const depots = db.getDepots();
  const resources = db.getResources();

  // Clear previous allocations
  db.clearAllocations();

  // Solve the constrained allocation problem
  const result = optimizeResourceAllocation(incidents, depots, resources);

  // Commit allocations to DB
  result.allocations.forEach(alloc => {
    db.saveAllocation(alloc);
  });

  // Automatically update incident status to 'Active' if they received any allocations
  incidents.forEach(inc => {
    if (inc.status === 'Pending') {
      const hasAllocations = result.allocations.some(a => a.incidentId === inc.id);
      if (hasAllocations) {
        db.updateIncidentStatus(inc.id, 'Active');
      }
    }
  });

  // Query Gemini AI reasoning agent for explains / trade-offs
  const refreshedAllocations = db.getAllocations();
  const narrative = await generateAgentNarrative(
    db.getIncidents(),
    depots,
    db.getResources(),
    refreshedAllocations,
    result.unmetNeeds
  );

  db.saveAgentNarrative(narrative);
  broadcastState();
}

/**
 * Appends a new synthetic disaster incident to the DB and alerts operators in real time
 */
export function addSimulatedIncident() {
  const scenario = SIM_SCENARIOS[Math.floor(Math.random() * SIM_SCENARIOS.length)];
  const randomShift = () => (Math.random() - 0.5) * 0.04; // Add slight coordinate fuzzing for realistic spreads

  // Run ML classification
  const mlFeatures = {
    peopleAffected: scenario.peopleAffected,
    disasterType: scenario.disasterType,
    district: scenario.district,
    description: scenario.description,
    source: scenario.source,
  };

  const mlResult = classifySeverity(mlFeatures);

  const newIncident: Incident = {
    id: `inc_sim_${Date.now()}`,
    lat: scenario.lat + randomShift(),
    lng: scenario.lng + randomShift(),
    district: scenario.district,
    disasterType: scenario.disasterType,
    description: scenario.description,
    reportedSeverity: scenario.reportedSeverity,
    peopleAffected: scenario.peopleAffected,
    timestamp: new Date().toISOString(),
    source: scenario.source,
    status: 'Pending',
    severityScore: mlResult.score,
    severityLabel: mlResult.label,
  };

  db.saveIncident(newIncident);
  
  // Re-run the optimizer automatically so fresh allocations are immediately computed
  triggerOptimization().catch(err => {
    console.error('Failed to run optimizer after simulated incident:', err);
    broadcastState();
  });
}

/**
 * Configures the server's WebSocket layer and attaches handlers
 */
export function setupWebsocket(server: any) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    const pathname = request.url;
    if (pathname === '/ws') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`New Operator/Responder client connected to live disaster command. Active clients: ${clients.size}`);

    // Immediately send the current database state to the newly connected user
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      data: {
        incidents: db.getIncidents(),
        depots: db.getDepots(),
        resources: db.getResources(),
        allocations: db.getAllocations(),
        agentNarrative: db.getAgentNarrative(),
        stats: calculateStats(),
        simulationActive,
      }
    }));

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log('Received WebSocket message:', payload.type);

        switch (payload.type) {
          case 'OPTIMIZE':
            await triggerOptimization();
            break;

          case 'RESET':
            db.resetDatabase();
            broadcastState();
            break;

          case 'RESOLVE_INCIDENT': {
            const { incidentId, responder } = payload.data;
            db.updateIncidentStatus(incidentId, 'Resolved', responder);
            // Re-trigger optimization to free up resources
            await triggerOptimization();
            break;
          }

          case 'TOGGLE_SIMULATION': {
            simulationActive = !simulationActive;
            if (simulationActive) {
              console.log('Disaster live reports feed started.');
              addSimulatedIncident(); // trigger one immediately
              simInterval = setInterval(() => {
                addSimulatedIncident();
              }, 20000); // add a new report every 20 seconds
            } else {
              console.log('Disaster live reports feed stopped.');
              if (simInterval) clearInterval(simInterval);
            }
            broadcastState();
            break;
          }

          default:
            console.warn('Unknown ws message type:', payload.type);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Disaster client disconnected. Remaining active clients: ${clients.size}`);
    });
  });
}
