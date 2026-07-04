import { Incident, Depot, Resource, Allocation, ResourceType } from '../src/types.js';

// Average emergency response speed (km/h)
const EMERGENCY_SPEED_KMH = 50;
const BASE_PREP_TIME_MINUTES = 10;

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Estimates Travel Time in minutes based on distance and emergency speed
 */
export function estimateTravelTime(distanceKm: number): number {
  const travelTimeHours = distanceKm / EMERGENCY_SPEED_KMH;
  return Math.round(travelTimeHours * 60 + BASE_PREP_TIME_MINUTES);
}

export interface OptimizationResult {
  allocations: Allocation[];
  unmetNeeds: {
    incidentId: string;
    resourceType: ResourceType;
    requiredQuantity: number;
    allocatedQuantity: number;
    missingQuantity: number;
  }[];
  avgEtaMinutes: number;
  totalAllocationsCount: number;
  resourceSummary: {
    type: ResourceType;
    total: number;
    allocated: number;
    available: number;
  }[];
}

/**
 * Custom Constrained Optimization Engine
 * Maximizes severity-weighted coverage subject to:
 * - Resource capacity constraints (can't allocate more than available at depots)
 * - Proximity constraints (prefer closer depots, compute Haversine ETAs)
 * - Minimum response-time constraints (prioritize nearest assets to Critical incidents first)
 */
export function optimizeResourceAllocation(
  incidents: Incident[],
  depots: Depot[],
  resources: Resource[]
): OptimizationResult {
  // Reset allocations list
  const allocations: Allocation[] = [];
  const unmetNeeds: OptimizationResult['unmetNeeds'] = [];

  // Create deep copies of resources to track inventory state during allocation solver
  const resourcePool = resources.map(r => ({ ...r }));

  // 1. Sort incidents by Priority: Severity Score * (1 + (People Affected / 100))
  // Filter only 'Pending' or 'Active' incidents that need resources
  const activeIncidents = incidents
    .filter(inc => inc.status !== 'Resolved')
    .map(inc => {
      const priority = inc.severityScore * (1 + inc.peopleAffected / 100);
      return { ...inc, priority };
    })
    .sort((a, b) => b.priority - a.priority); // Highest priority first

  // 2. Define resource demands per incident based on disaster type and affected people
  const getResourceDemands = (inc: Incident): Record<ResourceType, number> => {
    const demands: Record<ResourceType, number> = {
      'Ambulance': 0,
      'Rescue Boat': 0,
      'Food Supply': 0,
      'Medical Kit': 0,
      'Shelter Space': 0,
    };

    const count = inc.peopleAffected;

    switch (inc.disasterType) {
      case 'Flood':
        demands['Rescue Boat'] = Math.ceil(count / 10); // 1 boat per 10 people
        demands['Food Supply'] = count * 2; // 2 food kits per person
        demands['Medical Kit'] = Math.ceil(count / 4); // 1 kit per 4 people
        demands['Shelter Space'] = count; // 1 shelter space per person
        break;

      case 'Cyclone':
        demands['Rescue Boat'] = inc.severityLabel === 'Critical' ? Math.ceil(count / 15) : 0;
        demands['Shelter Space'] = count;
        demands['Food Supply'] = count * 3; // 3 days food rations
        demands['Medical Kit'] = Math.ceil(count / 5);
        break;

      case 'Fire':
        demands['Ambulance'] = Math.max(1, Math.ceil(count / 5)); // 1 ambulance per 5 people
        demands['Medical Kit'] = Math.ceil(count / 2); // Higher medical need
        demands['Shelter Space'] = count > 30 ? Math.ceil(count / 2) : 0;
        break;

      case 'Earthquake':
        demands['Ambulance'] = Math.max(1, Math.ceil(count / 5));
        demands['Shelter Space'] = count;
        demands['Medical Kit'] = count;
        demands['Food Supply'] = count * 2;
        break;

      case 'Landslide':
        demands['Ambulance'] = Math.max(1, Math.ceil(count / 3)); // Mountain trauma needs
        demands['Shelter Space'] = count;
        demands['Medical Kit'] = count;
        demands['Food Supply'] = count;
        break;
    }

    return demands;
  };

  let allocationIdCounter = 1;

  // 3. Main Solver Loop (Iterate through prioritized incidents)
  activeIncidents.forEach(inc => {
    const demands = getResourceDemands(inc);

    // Process each required resource type
    (Object.keys(demands) as ResourceType[]).forEach(resType => {
      const requiredQty = demands[resType];
      if (requiredQty <= 0) return;

      let remainingToAllocate = requiredQty;
      let totalAllocatedForThisDemand = 0;

      // Find all depots with available resource pool of this type, and calculate distance/ETA
      const candidateResources = resourcePool
        .filter(r => r.type === resType && r.available > 0)
        .map(r => {
          const depot = depots.find(d => d.id === r.depotId)!;
          const dist = calculateHaversineDistance(depot.lat, depot.lng, inc.lat, inc.lng);
          const eta = estimateTravelTime(dist);
          return { resource: r, depot, distance: dist, eta };
        })
        .sort((a, b) => a.eta - b.eta); // Proximity constraint: nearest depot first

      // Allocate from nearest depots
      for (const candidate of candidateResources) {
        if (remainingToAllocate <= 0) break;

        const avail = candidate.resource.available;
        const toTake = Math.min(avail, remainingToAllocate);

        if (toTake > 0) {
          // Commit allocation
          allocations.push({
            id: `alloc_${allocationIdCounter++}`,
            incidentId: inc.id,
            resourceId: candidate.resource.id,
            resourceType: resType,
            quantity: toTake,
            etaMinutes: candidate.eta,
            status: 'Dispatched',
          });

          // Deduct from temporary resource pool
          candidate.resource.available -= toTake;
          candidate.resource.allocated += toTake;

          remainingToAllocate -= toTake;
          totalAllocatedForThisDemand += toTake;
        }
      }

      // If cannot fully satisfy, mark as unmet need
      if (remainingToAllocate > 0) {
        unmetNeeds.push({
          incidentId: inc.id,
          resourceType: resType,
          requiredQuantity: requiredQty,
          allocatedQuantity: totalAllocatedForThisDemand,
          missingQuantity: remainingToAllocate,
        });
      }
    });
  });

  // 4. Calculate Summary Metrics
  const totalAllocationsCount = allocations.length;
  const avgEtaMinutes = totalAllocationsCount > 0
    ? Math.round(allocations.reduce((sum, a) => sum + a.etaMinutes, 0) / totalAllocationsCount)
    : 0;

  // Calculate inventory status summarizing allocations per type
  const resourceSummary: OptimizationResult['resourceSummary'] = [
    'Ambulance', 'Rescue Boat', 'Food Supply', 'Medical Kit', 'Shelter Space'
  ].map(type => {
    const matchingPool = resourcePool.filter(r => r.type === type);
    const total = matchingPool.reduce((sum, r) => sum + r.total, 0);
    const allocated = matchingPool.reduce((sum, r) => sum + r.allocated, 0);
    const available = matchingPool.reduce((sum, r) => sum + r.available, 0);
    return { type: type as ResourceType, total, allocated, available };
  });

  return {
    allocations,
    unmetNeeds,
    avgEtaMinutes,
    totalAllocationsCount,
    resourceSummary,
  };
}
