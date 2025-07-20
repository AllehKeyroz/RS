'use server';

import { cookies } from 'next/headers';
import { Agent } from '../types';
import { saveAgents, getSavedAgents, saveWebhookData, getSavedWebhookData, saveDistributionSettings, getDistributionSettings } from '../lib/persistence';

const API_KEY_COOKIE = 'gohighlevel_api_key';

export async function storeApiKey(apiKey: string): Promise<void> {
  cookies().set(API_KEY_COOKIE, apiKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 }); // 1 week
}

export async function getApiKey(): Promise<string | undefined> {
  return (await cookies()).get(API_KEY_COOKIE)?.value;
}

export async function fetchAgents(apiKey: string): Promise<Agent[]> {
  if (!apiKey) {
    return [];
  }

  const url = "https://rest.gohighlevel.com/v1/users/";

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    const goHighLevelAgents = data.users.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      isAvailable: user.availability ?? true,
      distributionPercentage: 0, // Default, will be overridden by saved state
      leadCount: 0, // Default, will be overridden by saved state
    }));

    // Get currently saved agents from persistence
    const savedAgents = await getSavedAgents();
    const savedAgentsMap = new Map<string, Agent>();
    savedAgents.forEach(agent => savedAgentsMap.set(agent.id, agent));

    // Merge GoHighLevel agents with saved agents
    const mergedAgents: Agent[] = goHighLevelAgents.map((ghlAgent: Agent) => {
      const savedAgent = savedAgentsMap.get(ghlAgent.id);
      if (savedAgent) {
        return {
          ...ghlAgent,
          distributionPercentage: savedAgent.distributionPercentage,
          leadCount: savedAgent.leadCount,
        };
      }
      return ghlAgent;
    });

    // Save the merged agents back to persistence
    await saveAgents(mergedAgents);

    return mergedAgents;
  } catch (error: any) {
    console.error('Falha ao buscar agentes:', error);
    throw new Error(error.message);
  }
}

export async function storeWebhookData(data: any): Promise<void> {
  await saveWebhookData(data);
}

export async function fetchLatestWebhook(): Promise<any | undefined> {
  return await getSavedWebhookData();
}

export async function updateAgentsState(agents: Agent[]): Promise<void> {
  await saveAgents(agents);
}

export async function getAgentsState(): Promise<Agent[]> {
  return await getSavedAgents();
}

export async function storeDistributionEnabled(enabled: boolean): Promise<void> {
  await saveDistributionSettings(enabled);
}

export async function getDistributionEnabled(): Promise<boolean> {
  const settings = await getDistributionSettings();
  return settings.isDistributionEnabled;
}