import express from 'express';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { setupWebsocket, triggerOptimization, broadcastState, calculateStats } from './server/websocket.js';
import { classifySeverity, trainClassifierReport } from './server/classifier.js';
import { Incident } from './src/types.js';
import { calculateHaversineDistance } from './server/optimizer.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// API: Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Get current metrics and dashboard state
app.get('/api/state', (req, res) => {
  res.json({
    incidents: db.getIncidents(),
    depots: db.getDepots(),
    resources: db.getResources(),
    allocations: db.getAllocations(),
    agentNarrative: db.getAgentNarrative(),
    stats: calculateStats(),
  });
});

// API: Public Citizen Lookup
app.get('/api/public/lookup', (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm) || 15;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
    }

    const incidents = db.getIncidents();
    const depots = db.getDepots();
    const allocations = db.getAllocations();
    const resources = db.getResources();

    // 1. Filter nearby incidents
    // - status !== 'Resolved'
    // - distance <= radiusKm
    // Sort nearby incidents by distance ascending
    const activeNearbyIncidents = incidents
      .filter(inc => inc.status !== 'Resolved')
      .map(inc => {
        const distanceKm = calculateHaversineDistance(lat, lng, inc.lat, inc.lng);
        return { ...inc, distanceKm };
      })
      .filter(inc => inc.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const formattedIncidents = activeNearbyIncidents.map(inc => {
      // Find allocations for this incident, join and resolve resourceType, status, etaMinutes
      const incAllocations = allocations
        .filter(alloc => alloc.incidentId === inc.id)
        .map(alloc => ({
          resourceType: alloc.resourceType,
          quantity: alloc.quantity,
          status: alloc.status,
          etaMinutes: Math.round(alloc.etaMinutes),
        }));

      return {
        id: inc.id,
        district: inc.district,
        disasterType: inc.disasterType,
        severityLabel: inc.severityLabel,
        status: inc.status,
        distanceKm: Math.round(inc.distanceKm * 10) / 10,
        peopleAffected: inc.peopleAffected,
        allocations: incAllocations,
      };
    });

    // 2. Filter nearby depots
    // - distance <= radiusKm
    // - if none within radius, return the 3 closest regardless
    // Sort by distance ascending
    const nearbyDepotMatches = depots
      .map(depot => {
        const distanceKm = calculateHaversineDistance(lat, lng, depot.lat, depot.lng);
        return { ...depot, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const depotsWithinRadius = nearbyDepotMatches.filter(d => d.distanceKm <= radiusKm);
    const finalDepots = depotsWithinRadius.length > 0 ? depotsWithinRadius : nearbyDepotMatches.slice(0, 3);

    const formattedDepots = finalDepots.map(depot => {
      // Find Shelter Space and Food Supply resources for this depot
      const depotResources = resources
        .filter(r => r.depotId === depot.id && (r.type === 'Shelter Space' || r.type === 'Food Supply'))
        .map(r => ({
          type: r.type,
          available: r.available,
          total: r.total,
        }));

      return {
        id: depot.id,
        name: depot.name,
        district: depot.district,
        distanceKm: Math.round(depot.distanceKm * 10) / 10,
        resources: depotResources,
      };
    });

    res.json({
      nearbyIncidents: formattedIncidents,
      nearbyDepots: formattedDepots,
    });
  } catch (err: any) {
    console.error('Failed to run public lookup:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// API: Add a new manual incident report
app.post('/api/incidents', async (req, res) => {
  try {
    const { lat, lng, district, disasterType, description, reportedSeverity, peopleAffected, source } = req.body;

    if (!lat || !lng || !district || !disasterType || !description || !reportedSeverity || !peopleAffected || !source) {
      return res.status(400).json({ error: 'Missing required incident fields.' });
    }

    // Run custom ML severity classifier
    const mlResult = classifySeverity({
      peopleAffected: Number(peopleAffected),
      disasterType,
      district,
      description,
      source,
    });

    const newIncident: Incident = {
      id: `inc_manual_${Date.now()}`,
      lat: Number(lat),
      lng: Number(lng),
      district,
      disasterType,
      description,
      reportedSeverity,
      peopleAffected: Number(peopleAffected),
      timestamp: new Date().toISOString(),
      source,
      status: 'Pending',
      severityScore: mlResult.score,
      severityLabel: mlResult.label,
    };

    db.saveIncident(newIncident);

    // Auto-trigger optimization immediately on fresh manual submissions
    await triggerOptimization();

    res.status(201).json({ message: 'Incident logged and optimal assets dispatched.', incident: newIncident });
  } catch (err: any) {
    console.error('Failed to save manual incident:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// API: Force recalculate optimal resources
app.post('/api/optimize', async (req, res) => {
  try {
    await triggerOptimization();
    res.json({ status: 'success', message: 'Resource optimization ran successfully.' });
  } catch (err: any) {
    console.error('Optimization triggering failed:', err);
    res.status(500).json({ error: err.message || 'Optimization solver failed.' });
  }
});

// API: Classifier model training audit log (Academic F1 score, classes)
app.get('/api/classifier/audit', (req, res) => {
  try {
    const report = trainClassifierReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Reset DB to defaults
app.post('/api/reset', (req, res) => {
  db.resetDatabase();
  broadcastState();
  res.json({ message: 'Database reset successfully to pre-seeded Tamil Nadu defaults.' });
});

// Setup WebSocket handling attached on port 3000
setupWebsocket(server);

// Vite Integration: Serve frontend SPA assets
async function startViteServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Disaster Command Server running on http://0.0.0.0:${PORT}`);
  });
}

startViteServer().catch(err => {
  console.error('Failed to start Vite middleware server:', err);
});
