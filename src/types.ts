export type DisasterType = 'Flood' | 'Earthquake' | 'Cyclone' | 'Fire' | 'Landslide';
export type SeverityLabel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentSource = 'Citizen' | 'Sensor' | 'News' | 'Official';
export type IncidentStatus = 'Pending' | 'Active' | 'Resolved';
export type ResourceType = 'Ambulance' | 'Rescue Boat' | 'Food Supply' | 'Medical Kit' | 'Shelter Space';
export type AllocationStatus = 'Dispatched' | 'EnRoute' | 'Active' | 'Resolved';

export interface Incident {
  id: string;
  lat: number;
  lng: number;
  district: string;
  disasterType: DisasterType;
  description: string;
  reportedSeverity: SeverityLabel;
  peopleAffected: number;
  timestamp: string;
  source: IncidentSource;
  status: IncidentStatus;
  severityScore: number; // 0 - 100 ML-determined score
  severityLabel: SeverityLabel; // ML-determined category
  assignedResponder?: string;
}

export interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  total: number;
  allocated: number;
  available: number;
  depotId: string;
}

export interface Allocation {
  id: string;
  incidentId: string;
  resourceId: string;
  resourceType: ResourceType;
  quantity: number;
  etaMinutes: number;
  status: AllocationStatus;
}

export interface AgentNarrative {
  situationOverview: string;
  actionPlan: string[];
  justification: string;
  regionalRisks: string[];
  resourceBottlenecks: string[];
  generatedAt: string;
}

export interface AppStats {
  totalIncidents: number;
  pendingIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  totalResources: number;
  deployedResources: number;
  avgResponseEta: number;
  unmetNeedCount: number;
}
