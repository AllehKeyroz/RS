"use server";

export type Agent = {
  id: string;
  name: string;
  email: string;
  isAvailable: boolean;
  score: number;
  leadCount: number;
  role: string;
  locationId: string;
};

// This will hold the latest webhook payload and API key in memory.
// Note: In a serverless environment, this state is not guaranteed to persist across requests.
// This is a simplified approach that works well in a single-instance environment (like a VPS).
let latestWebhookPayload: any = null;
let storedApiKey: string | null = process.env.GOHIGHLEVEL_API_KEY || null;

// In-memory state for agents, since we are on a single instance VPS
let agentsState: Agent[] = [];


export async function storeApiKey(key: string): Promise<void> {
  storedApiKey = key;
}

export async function getApiKey(): Promise<string | null> {
  return storedApiKey;
}

export async function fetchAgents(apiKey?: string): Promise<Agent[]> {
  const keyToUse = apiKey || storedApiKey;
  if (!keyToUse) {
    // Return an empty array if no key is available, preventing an error.
    return [];
  }

  const url = "https://rest.gohighlevel.com/v1/users/";

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Chave da API inválida ou não autorizada.');
      }
      const errorBody = await response.text();
      throw new Error(`Erro ao buscar agentes: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    
    const fetchedAgents = data.users.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      isAvailable: user.availability ?? true,
      score: Math.floor(Math.random() * 31) + 70, // Default score
      leadCount: 0,
      role: user.role,
      locationId: user.locationId,
    }));
    
    // Initialize or update agentsState
    agentsState = fetchedAgents;
    return agentsState;
  } catch (error: any) {
    console.error('Falha ao buscar agentes:', error);
    // Re-throw the specific error message for the UI
    throw new Error(error.message);
  }
}

async function selectAgentForLead(): Promise<Agent | null> {
  // Use the in-memory agentsState
  if (agentsState.length === 0) {
      // Fetch agents if state is empty, as a fallback
      await fetchAgents();
  }
  
  const availableAgents = agentsState.filter(agent => agent.isAvailable);
  if (availableAgents.length === 0) {
    return null;
  }
  
  availableAgents.sort((a, b) => b.score - a.score);
  const selectedAgent = availableAgents[0];

  // Increment lead count in the in-memory state
  const agentIndex = agentsState.findIndex(agent => agent.id === selectedAgent.id);
  if(agentIndex !== -1) {
    agentsState[agentIndex].leadCount += 1;
  }

  return selectedAgent;
}


export async function processWebhook(payload: any): Promise<{ selectedAgent: string | null }> {
  latestWebhookPayload = payload;
  
  const selectedAgent = await selectAgentForLead();

  if (selectedAgent) {
    console.log(`Lead atribuído a: ${selectedAgent.name}. Contagem atual: ${selectedAgent.leadCount}`);
    return { selectedAgent: selectedAgent.name };
  }
  
  console.log('Nenhum agente disponível para atribuir o lead.');
  return { selectedAgent: null };
}

export async function fetchLatestWebhook(): Promise<any | null> {
  return latestWebhookPayload;
}

export async function updateAgentsState(updatedAgents: Agent[]): Promise<void> {
    agentsState = updatedAgents;
}

export async function getAgentsState(): Promise<Agent[]> {
    return agentsState;
}