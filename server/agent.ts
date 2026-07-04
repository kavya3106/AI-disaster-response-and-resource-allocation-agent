import { GoogleGenAI, Type } from '@google/genai';
import { Incident, Depot, Resource, Allocation, AgentNarrative } from '../src/types.js';

// Setup Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const isRealApiKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10;

let ai: GoogleGenAI | null = null;
if (isRealApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI SDK:', err);
  }
}

/**
 * Fallback static/heuristic agent narrative generator.
 * Used when the Gemini API is unavailable or the API key is not set.
 */
function generateFallbackNarrative(
  incidents: Incident[],
  depots: Depot[],
  resources: Resource[],
  allocations: Allocation[],
  unmetNeeds: any[]
): AgentNarrative {
  const actionPlan: string[] = [];

  // Categorize allocations by incident
  const activeIncidents = incidents.filter(i => i.status !== 'Resolved');
  activeIncidents.forEach(inc => {
    const incAllocations = allocations.filter(a => a.incidentId === inc.id);
    if (incAllocations.length > 0) {
      const summary = incAllocations.map(a => `${a.quantity}x ${a.resourceType} (ETA: ${a.etaMinutes}m)`).join(', ');
      actionPlan.push(`Deploy resources to ${inc.district} - ${inc.disasterType}: ${summary} for ${inc.peopleAffected} citizens.`);
    }
  });

  if (actionPlan.length === 0) {
    actionPlan.push("No active deployments. All incidents are currently resolved or waitlisted.");
  }

  // Build a smart dynamic situation overview
  const totalAffected = activeIncidents.reduce((sum, i) => sum + i.peopleAffected, 0);
  const situationOverview = `Currently responding to ${activeIncidents.length} active disaster situations across Tamil Nadu, affecting approximately ${totalAffected} citizens. Operational severity classifications are based on real-time sensor feedback and local demographic impact models.`;

  // Build a smart dynamic justification based on active parameters
  const avgEta = allocations.length > 0
    ? Math.round(allocations.reduce((sum, a) => sum + a.etaMinutes, 0) / allocations.length)
    : 0;

  const justification = `Optimized allocations are calculated using Haversine distance. High priority is mapped to critical severity levels and high population counts. Average response ETA is ${avgEta} minutes. Resources are drawn from Chennai, Coimbatore, Madurai, and Trichy command depots depending on geographic proximity, saving valuable transit minutes.`;

  // Build regional risks
  const regionalRisks: string[] = [];
  activeIncidents.forEach(inc => {
    if (inc.district === 'Nilgiris') {
      regionalRisks.push(`Nilgiris: High risk of slope instability, landslide blockages, and mudslides affecting key ghat roads. Rescue kits and heavy utility vehicles are prioritized.`);
    } else if (inc.district === 'Chennai') {
      regionalRisks.push(`Chennai: Risk of heavy urban waterlogging and storm drain backups in low-lying residential clusters. Dispatch of rescue boats and dry rations is prioritized.`);
    } else if (inc.district === 'Cuddalore') {
      regionalRisks.push(`Cuddalore: High vulnerability to coastal cyclone surges and gale-force wind damage. Evacuation coordinates and medical chest units must remain ready.`);
    } else {
      regionalRisks.push(`${inc.district}: Area currently experiencing a ${inc.disasterType} event with an urgency score of ${inc.severityScore}. Emergency response actions have been adjusted for localized population vulnerability.`);
    }
  });
  if (regionalRisks.length === 0) {
    regionalRisks.push("No active localized environmental threat advisories generated.");
  }

  // Build bottlenecks
  const resourceBottlenecks: string[] = [];
  if (unmetNeeds.length > 0) {
    const criticalUnmet = unmetNeeds.filter(un => {
      const inc = incidents.find(i => i.id === un.incidentId);
      return inc && inc.severityLabel === 'Critical';
    });

    if (criticalUnmet.length > 0) {
      resourceBottlenecks.push(`CRITICAL BOTTLENECK: Severe stock shortages for ${Array.from(new Set(criticalUnmet.map(un => un.resourceType))).join(', ')} in active high-priority zones (including ${Array.from(new Set(criticalUnmet.map(un => {
        const inc = incidents.find(i => i.id === un.incidentId);
        return inc ? inc.district : '';
      }).filter(Boolean))).join(', ')}).`);
    } else {
      resourceBottlenecks.push(`Supply Constraints: Minor waitlist delays recorded for ${Array.from(new Set(unmetNeeds.map(un => un.resourceType))).join(', ')} in medium or low severity incidents.`);
    }
  } else {
    resourceBottlenecks.push("All requested resource categories are within standard safety margin parameters; command depots currently retain sufficient backup supply.");
  }

  return {
    situationOverview,
    actionPlan,
    justification,
    regionalRisks,
    resourceBottlenecks,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Main AI Reasoning Agent.
 * Queries Gemini 3.5-flash to generate explainable AI action plans and trade-offs.
 * Safely falls back to the heuristic generator if the Gemini API is offline or not configured.
 */
export async function generateAgentNarrative(
  incidents: Incident[],
  depots: Depot[],
  resources: Resource[],
  allocations: Allocation[],
  unmetNeeds: any[]
): Promise<AgentNarrative> {
  const fallback = generateFallbackNarrative(incidents, depots, resources, allocations, unmetNeeds);

  if (!ai) {
    console.log('Gemini API key is missing or invalid. Utilizing local heuristic-based narrative agent.');
    return fallback;
  }

  try {
    const prompt = `
You are the AI Commander of the Disaster Response and Resource Allocation Command. Your job is to take raw incident reports, depot coordinates, and structured optimizer outputs, and generate an explainable, authoritative, and highly detailed response plan in JSON format.

Here is the structured scenario:

### 1. Active Incidents:
${JSON.stringify(incidents.filter(i => i.status !== 'Resolved').map(i => ({
  id: i.id,
  location: `${i.district} (${i.lat}, ${i.lng})`,
  type: i.disasterType,
  reportedSeverity: i.reportedSeverity,
  severityScore: i.severityScore,
  severityLabel: i.severityLabel,
  peopleAffected: i.peopleAffected,
  description: i.description
})), null, 2)}

### 2. Available Command Depots:
${JSON.stringify(depots.map(d => ({ id: d.id, name: d.name, district: d.district })), null, 2)}

### 3. Optimizer Resource Allocations:
${JSON.stringify(allocations.map(a => {
  const inc = incidents.find(i => i.id === a.incidentId);
  return {
    incidentId: a.incidentId,
    disasterType: inc?.disasterType,
    district: inc?.district,
    resource: a.resourceType,
    quantity: a.quantity,
    etaMinutes: a.etaMinutes
  };
}), null, 2)}

### 4. Unmet Resource Needs:
${JSON.stringify(unmetNeeds, null, 2)}

Your response MUST match this strict JSON schema. Produce only the raw JSON. Do not include markdown code block characters like \`\`\`json.

Ensure you provide detailed, professional, and context-aware responses:
1. situationOverview: A detailed 2-3 sentence overview of the current disaster footprint across the state, highlighting major hazard clusters and total estimated populations impacted.
2. actionPlan: A list of 3 to 6 highly tactical bullet points specifying exactly who gets what from where, including depot/destination names and travel ETAs.
3. justification: A comprehensive explanation (3-4 sentences) analyzing the solver's trade-offs, how proximity (Haversine distance) was balanced against high severity levels and population weights, and why secondary priorities may have been waitlisted.
4. regionalRisks: Localized risk assessments for active districts (e.g. mudslide hazards in Nilgiris, storm sewer inundation in Chennai, coastal surges in Cuddalore). Provide one concise bullet per active district explaining the regional hazard vulnerability.
5. resourceBottlenecks: Highlight specific supply deficits, identifying which resources (e.g. Rescue Boats, Ambulances) are fully depleted at critical depots and recommending action parameters for regional state authorities.

Generate the structured response plan now.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            situationOverview: {
              type: Type.STRING,
              description: "A summary overview of the current state-wide disaster scenario."
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of precise tactical dispatches."
            },
            justification: {
              type: Type.STRING,
              description: "A detailed description explaining prioritization logic and knapsack solver trade-offs."
            },
            regionalRisks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of local regional environmental risk factors."
            },
            resourceBottlenecks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of critical depot inventory shortages and waitlisted areas."
            }
          },
          required: ["situationOverview", "actionPlan", "justification", "regionalRisks", "resourceBottlenecks"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Gemini returned an empty text response.');
    }

    const parsed = JSON.parse(text);
    return {
      situationOverview: parsed.situationOverview || fallback.situationOverview,
      actionPlan: parsed.actionPlan || fallback.actionPlan,
      justification: parsed.justification || fallback.justification,
      regionalRisks: parsed.regionalRisks || fallback.regionalRisks,
      resourceBottlenecks: parsed.resourceBottlenecks || fallback.resourceBottlenecks,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to generate AI narrative from Gemini. Falling back to heuristic narrative:', err);
    return fallback;
  }
}
