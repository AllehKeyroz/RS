'use server';

import { cookies } from 'next/headers';
import { Qualification, Agent } from '../types';

const API_KEY_COOKIE = 'gohighlevel_api_key';
const AGENTS_STATE_COOKIE = 'agents_state';
const WEBHOOK_DATA_COOKIE = 'webhook_data';

export async function storeApiKey(apiKey: string): Promise<void> {
  cookies().set(API_KEY_COOKIE, apiKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 }); // 1 week
}

export async function getApiKey(): Promise<string | undefined> {
  return cookies().get(API_KEY_COOKIE)?.value;
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

    const fetchedAgents = data.users.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      isAvailable: user.availability ?? true,
      qualification: Qualification.INICIANTE, // Default qualification
      leadCount: 0,
    }));

    return fetchedAgents;
  } catch (error: any) {
    console.error('Falha ao buscar agentes:', error);
    throw new Error(error.message);
  }
}

export async function storeWebhookData(data: any): Promise<void> {
  cookies().set(WEBHOOK_DATA_COOKIE, JSON.stringify(data), { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
}

export async function fetchLatestWebhook(): Promise<any | undefined> {
  const data = cookies().get(WEBHOOK_DATA_COOKIE)?.value;
  return data ? JSON.parse(data) : undefined;
}

export async function updateAgentsState(agents: Agent[]): Promise<void> {
  cookies().set(AGENTS_STATE_COOKIE, JSON.stringify(agents), { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
}

export async function getAgentsState(): Promise<Agent[]> {
  const data = cookies().get(AGENTS_STATE_COOKIE)?.value;
  return data ? JSON.parse(data) : [];
}