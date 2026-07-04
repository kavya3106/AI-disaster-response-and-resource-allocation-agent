import fs from 'fs';
import path from 'path';
import { Incident, Depot, Resource, Allocation, AgentNarrative } from '../src/types.js';

const DB_FILE = path.join(process.cwd(), 'data.json');

interface DatabaseSchema {
  incidents: Incident[];
  depots: Depot[];
  resources: Resource[];
  allocations: Allocation[];
  agentNarrative: AgentNarrative | null;
}

const DEFAULT_DEPOTS: Depot[] = [
  { id: 'depot_chennai', name: 'Chennai Central Disaster Depot', lat: 13.0827, lng: 80.2707, district: 'Chennai' },
  { id: 'depot_coimbatore', name: 'Coimbatore Western Command Depot', lat: 11.0168, lng: 76.9558, district: 'Coimbatore' },
  { id: 'depot_trichy', name: 'Trichy Delta Regional Depot', lat: 10.7905, lng: 78.7047, district: 'Trichy' },
  { id: 'depot_madurai', name: 'Madurai Southern Command Depot', lat: 9.9252, lng: 78.1198, district: 'Madurai' },
  { id: 'depot_ooty', name: 'Nilgiris Mountain Rescue Station', lat: 11.4102, lng: 76.6950, district: 'Nilgiris' }
];

const DEFAULT_RESOURCES: Resource[] = [
  // Chennai Depot
  { id: 'res_ch_amb', name: 'Chennai Emergency Ambulance Fleet A', type: 'Ambulance', total: 15, allocated: 0, available: 15, depotId: 'depot_chennai' },
  { id: 'res_ch_boat', name: 'Chennai Coast Guard Rescue Boats', type: 'Rescue Boat', total: 10, allocated: 0, available: 10, depotId: 'depot_chennai' },
  { id: 'res_ch_food', name: 'Chennai Relief Food Supplies', type: 'Food Supply', total: 500, allocated: 0, available: 500, depotId: 'depot_chennai' },
  { id: 'res_ch_med', name: 'Chennai Rapid Trauma Kits', type: 'Medical Kit', total: 150, allocated: 0, available: 150, depotId: 'depot_chennai' },
  { id: 'res_ch_shelter', name: 'Chennai Multi-purpose Relief Shelter', type: 'Shelter Space', total: 300, allocated: 0, available: 300, depotId: 'depot_chennai' },

  // Coimbatore Depot
  { id: 'res_cbe_amb', name: 'Coimbatore Trauma Response Ambulances', type: 'Ambulance', total: 10, allocated: 0, available: 10, depotId: 'depot_coimbatore' },
  { id: 'res_cbe_food', name: 'Coimbatore NGO Prepared Food Supplies', type: 'Food Supply', total: 300, allocated: 0, available: 300, depotId: 'depot_coimbatore' },
  { id: 'res_cbe_med', name: 'Coimbatore Hospital Association Medical Kits', type: 'Medical Kit', total: 100, allocated: 0, available: 100, depotId: 'depot_coimbatore' },
  { id: 'res_cbe_shelter', name: 'Coimbatore Stadium Rescue Center', type: 'Shelter Space', total: 200, allocated: 0, available: 200, depotId: 'depot_coimbatore' },

  // Trichy Depot
  { id: 'res_try_amb', name: 'Trichy Municipal Ambulances', type: 'Ambulance', total: 8, allocated: 0, available: 8, depotId: 'depot_trichy' },
  { id: 'res_try_boat', name: 'Cauvery River Inflatable Boats', type: 'Rescue Boat', total: 6, allocated: 0, available: 6, depotId: 'depot_trichy' },
  { id: 'res_try_food', name: 'Trichy Agricultural Cooperative Grain Kits', type: 'Food Supply', total: 400, allocated: 0, available: 400, depotId: 'depot_trichy' },
  { id: 'res_try_med', name: 'Trichy Red Cross Medical Chests', type: 'Medical Kit', total: 80, allocated: 0, available: 80, depotId: 'depot_trichy' },
  { id: 'res_try_shelter', name: 'Trichy Exhibition Hall Shelter', type: 'Shelter Space', total: 150, allocated: 0, available: 150, depotId: 'depot_trichy' },

  // Madurai Depot
  { id: 'res_mdu_amb', name: 'Madurai Fire Service Ambulances', type: 'Ambulance', total: 8, allocated: 0, available: 8, depotId: 'depot_madurai' },
  { id: 'res_mdu_food', name: 'Madurai Temple Kitchen Rations', type: 'Food Supply', total: 350, allocated: 0, available: 350, depotId: 'depot_madurai' },
  { id: 'res_mdu_med', name: 'Madurai Government Hospital Disaster Kits', type: 'Medical Kit', total: 75, allocated: 0, available: 75, depotId: 'depot_madurai' },
  { id: 'res_mdu_shelter', name: 'Madurai College Campus Hostels', type: 'Shelter Space', total: 250, allocated: 0, available: 250, depotId: 'depot_madurai' },

  // Ooty Depot
  { id: 'res_oty_amb', name: 'Ooty High-Altitude Ambulances', type: 'Ambulance', total: 4, allocated: 0, available: 4, depotId: 'depot_ooty' },
  { id: 'res_oty_boat', name: 'Ooty Lake Rescue Rafts', type: 'Rescue Boat', total: 3, allocated: 0, available: 3, depotId: 'depot_ooty' },
  { id: 'res_oty_food', name: 'Ooty Emergency Dry Rations', type: 'Food Supply', total: 200, allocated: 0, available: 200, depotId: 'depot_ooty' },
  { id: 'res_oty_med', name: 'Ooty Alpine Trauma Medical Packs', type: 'Medical Kit', total: 50, allocated: 0, available: 50, depotId: 'depot_ooty' },
  { id: 'res_oty_shelter', name: 'Ooty Government Tourist Lodge Shelters', type: 'Shelter Space', total: 100, allocated: 0, available: 100, depotId: 'depot_ooty' }
];

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc_1',
    lat: 13.0427,
    lng: 80.2407,
    district: 'Chennai',
    disasterType: 'Flood',
    description: 'Severe water logging near Velachery housing sector. 45 citizens trapped in ground floor apartments. Power supply disabled.',
    reportedSeverity: 'High',
    peopleAffected: 45,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: 'Citizen',
    status: 'Pending',
    severityScore: 82,
    severityLabel: 'High'
  },
  {
    id: 'inc_2',
    lat: 13.1127,
    lng: 80.2907,
    district: 'Chennai',
    disasterType: 'Cyclone',
    description: 'High winds have uprooted heavy trees blocking major arterial roads in North Chennai, trapping a school bus with 15 children. Minor injuries reported.',
    reportedSeverity: 'Critical',
    peopleAffected: 20,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    source: 'Official',
    status: 'Active',
    severityScore: 92,
    severityLabel: 'Critical'
  },
  {
    id: 'inc_3',
    lat: 11.0268,
    lng: 76.9658,
    district: 'Coimbatore',
    disasterType: 'Fire',
    description: 'Major electrical short circuit fire in Gandhipuram textile mill warehouse. Dense toxic smoke spreading to neighboring residential blocks.',
    reportedSeverity: 'High',
    peopleAffected: 120,
    timestamp: new Date(Date.now() - 4200000).toISOString(),
    source: 'News',
    status: 'Pending',
    severityScore: 88,
    severityLabel: 'High'
  },
  {
    id: 'inc_4',
    lat: 11.4202,
    lng: 76.7150,
    district: 'Nilgiris',
    disasterType: 'Landslide',
    description: 'Landslide triggered by heavy torrential rain on Ooty-Mettupalayam road near Coonoor. 3 vehicles swept into a ravine, passenger numbers unknown.',
    reportedSeverity: 'Critical',
    peopleAffected: 12,
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    source: 'Sensor',
    status: 'Pending',
    severityScore: 95,
    severityLabel: 'Critical'
  },
  {
    id: 'inc_5',
    lat: 10.7955,
    lng: 78.7147,
    district: 'Trichy',
    disasterType: 'Flood',
    description: 'Cauvery river outflow level crossed danger mark. Low-lying farmlands and mud-houses in Srirangam completely inundated. 60 residents need immediate rescue.',
    reportedSeverity: 'High',
    peopleAffected: 60,
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    source: 'Official',
    status: 'Pending',
    severityScore: 85,
    severityLabel: 'High'
  },
  {
    id: 'inc_6',
    lat: 9.9352,
    lng: 78.1298,
    district: 'Madurai',
    disasterType: 'Earthquake',
    description: 'Mild tremors reported, resulting in structural wall collapse of an old retail shop near Madurai Meenakshi Temple. 3 pedestrians trapped under debris.',
    reportedSeverity: 'High',
    peopleAffected: 5,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    source: 'Citizen',
    status: 'Pending',
    severityScore: 78,
    severityLabel: 'High'
  },
  {
    id: 'inc_7',
    lat: 11.7580,
    lng: 79.7814,
    district: 'Cuddalore',
    disasterType: 'Cyclone',
    description: 'Severe storm surge in coastal village near Cuddalore port. Fishing boats wrecked, seawater entering houses. 150 villagers need relocation to safe shelter.',
    reportedSeverity: 'High',
    peopleAffected: 150,
    timestamp: new Date(Date.now() - 6000000).toISOString(),
    source: 'Official',
    status: 'Pending',
    severityScore: 89,
    severityLabel: 'High'
  },
  {
    id: 'inc_8',
    lat: 10.9701,
    lng: 78.0866,
    district: 'Karur',
    disasterType: 'Flood',
    description: 'Amaravathy river canal breached, flooding nearby agricultural laborer settlements. 30 families trapped on roofs.',
    reportedSeverity: 'High',
    peopleAffected: 30,
    timestamp: new Date(Date.now() - 3000000).toISOString(),
    source: 'Citizen',
    status: 'Pending',
    severityScore: 80,
    severityLabel: 'High'
  },
  {
    id: 'inc_9',
    lat: 11.6743,
    lng: 78.1560,
    district: 'Salem',
    disasterType: 'Fire',
    description: 'Forest fire detected in Shevaroys/Yercaud hills foothills. Spreading rapidly towards tourist resorts due to dry summer wind gusts.',
    reportedSeverity: 'Medium',
    peopleAffected: 80,
    timestamp: new Date(Date.now() - 10000000).toISOString(),
    source: 'Sensor',
    status: 'Pending',
    severityScore: 65,
    severityLabel: 'Medium'
  },
  {
    id: 'inc_10',
    lat: 13.0627,
    lng: 80.2007,
    district: 'Chennai',
    disasterType: 'Flood',
    description: 'Subway water logging at Nungambakkam. Two private cars submerged completely, drivers escaped but traffic is severely paralyzed with multiple collisions nearby.',
    reportedSeverity: 'Medium',
    peopleAffected: 8,
    timestamp: new Date(Date.now() - 4800000).toISOString(),
    source: 'News',
    status: 'Pending',
    severityScore: 55,
    severityLabel: 'Medium'
  },
  {
    id: 'inc_11',
    lat: 11.0068,
    lng: 76.9258,
    district: 'Coimbatore',
    disasterType: 'Fire',
    description: 'Chemical spill and small blast at an industrial processing unit in Singanallur. 4 operators sustained chemical burns. Toxic fumes leaking.',
    reportedSeverity: 'Critical',
    peopleAffected: 15,
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    source: 'Official',
    status: 'Active',
    severityScore: 94,
    severityLabel: 'Critical'
  },
  {
    id: 'inc_12',
    lat: 11.4002,
    lng: 76.6850,
    district: 'Nilgiris',
    disasterType: 'Landslide',
    description: 'Mudslide hit a remote tribal settlement near Gudalur. Two houses completely crushed. Debris blocking all entry roads. 15 people missing.',
    reportedSeverity: 'Critical',
    peopleAffected: 35,
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    source: 'Citizen',
    status: 'Pending',
    severityScore: 97,
    severityLabel: 'Critical'
  },
  {
    id: 'inc_13',
    lat: 10.7705,
    lng: 78.6847,
    district: 'Trichy',
    disasterType: 'Flood',
    description: 'Overflow in regional drainage canals. Water logging in low-income housing colony in Thiruverumbur. 80 elderly residents trapped inside houses.',
    reportedSeverity: 'High',
    peopleAffected: 80,
    timestamp: new Date(Date.now() - 9000000).toISOString(),
    source: 'Citizen',
    status: 'Pending',
    severityScore: 84,
    severityLabel: 'High'
  },
  {
    id: 'inc_14',
    lat: 9.9152,
    lng: 78.1098,
    district: 'Madurai',
    disasterType: 'Fire',
    description: 'Commercial market fire near Mattuthavani bus stand. High density of wooden stalls and combustible goods. Multiple shops ablaze.',
    reportedSeverity: 'High',
    peopleAffected: 200,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: 'News',
    status: 'Pending',
    severityScore: 91,
    severityLabel: 'Critical'
  },
  {
    id: 'inc_15',
    lat: 11.7380,
    lng: 79.7514,
    district: 'Cuddalore',
    disasterType: 'Flood',
    description: 'Inundation in Chidambaram block following excessive discharge from regional reservoirs. 100 residents cut off without drinking water and sanitation.',
    reportedSeverity: 'High',
    peopleAffected: 100,
    timestamp: new Date(Date.now() - 8000000).toISOString(),
    source: 'Official',
    status: 'Pending',
    severityScore: 81,
    severityLabel: 'High'
  }
];

function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const data: DatabaseSchema = {
        incidents: MOCK_INCIDENTS,
        depots: DEFAULT_DEPOTS,
        resources: DEFAULT_RESOURCES,
        allocations: [],
        agentNarrative: null,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database:', error);
    return {
      incidents: MOCK_INCIDENTS,
      depots: DEFAULT_DEPOTS,
      resources: DEFAULT_RESOURCES,
      allocations: [],
      agentNarrative: null,
    };
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

export const db = {
  getIncidents: (): Incident[] => readDB().incidents,
  getDepots: (): Depot[] => readDB().depots,
  getResources: (): Resource[] => readDB().resources,
  getAllocations: (): Allocation[] => readDB().allocations,
  getAgentNarrative: (): AgentNarrative | null => readDB().agentNarrative,

  saveIncident: (incident: Incident): Incident => {
    const data = readDB();
    const index = data.incidents.findIndex(i => i.id === incident.id);
    if (index >= 0) {
      data.incidents[index] = incident;
    } else {
      data.incidents.push(incident);
    }
    writeDB(data);
    return incident;
  },

  saveAllocation: (allocation: Allocation): Allocation => {
    const data = readDB();
    data.allocations.push(allocation);
    // Update resource allocated/available counts
    const resIndex = data.resources.findIndex(r => r.id === allocation.resourceId);
    if (resIndex >= 0) {
      const res = data.resources[resIndex];
      res.allocated = Math.min(res.total, res.allocated + allocation.quantity);
      res.available = Math.max(0, res.total - res.allocated);
    }
    writeDB(data);
    return allocation;
  },

  saveAgentNarrative: (narrative: AgentNarrative | null) => {
    const data = readDB();
    data.agentNarrative = narrative;
    writeDB(data);
  },

  updateIncidentStatus: (id: string, status: Incident['status'], responder?: string): Incident | null => {
    const data = readDB();
    const index = data.incidents.findIndex(i => i.id === id);
    if (index >= 0) {
      data.incidents[index].status = status;
      if (responder !== undefined) {
        data.incidents[index].assignedResponder = responder;
      }
      writeDB(data);
      return data.incidents[index];
    }
    return null;
  },

  clearAllocations: () => {
    const data = readDB();
    data.allocations = [];
    // Reset resources
    data.resources = data.resources.map(r => ({
      ...r,
      allocated: 0,
      available: r.total,
    }));
    data.agentNarrative = null;
    writeDB(data);
  },

  resetDatabase: () => {
    const data: DatabaseSchema = {
      incidents: JSON.parse(JSON.stringify(MOCK_INCIDENTS)),
      depots: DEFAULT_DEPOTS,
      resources: JSON.parse(JSON.stringify(DEFAULT_RESOURCES)),
      allocations: [],
      agentNarrative: null,
    };
    writeDB(data);
  }
};
