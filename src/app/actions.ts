'use server';

import { cookies } from 'next/headers';
import { Qualification, Agent } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';

const API_KEY_COOKIE = 'gohighlevel_api_key';

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
    const goHighLevelAgents = data.users.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      isAvailable: user.availability ?? true,
      qualification: Qualification.INICIANTE, // Default, will be overridden by Firestore if exists
      leadCount: 0, // Default, will be overridden by Firestore if exists
    }));

    // Fetch existing agents from Firestore
    const agentsCollectionRef = collection(db, 'agents');
    const firestoreAgentsSnapshot = await getDocs(agentsCollectionRef);
    const firestoreAgentsMap = new Map<string, Agent>();
    firestoreAgentsSnapshot.forEach(doc => {
      firestoreAgentsMap.set(doc.id, doc.data() as Agent);
    });

    // Merge GoHighLevel agents with Firestore agents
    const mergedAgents: Agent[] = goHighLevelAgents.map((ghlAgent: Agent) => {
      const firestoreAgent = firestoreAgentsMap.get(ghlAgent.id);
      if (firestoreAgent) {
        return {
          ...ghlAgent,
          qualification: firestoreAgent.qualification,
          leadCount: firestoreAgent.leadCount,
        };
      }
      return ghlAgent;
    });

    // Update Firestore with the merged agents
    for (const agent of mergedAgents) {
      const agentDocRef = doc(db, 'agents', agent.id);
      await setDoc(agentDocRef, agent, { merge: true });
    }

    return mergedAgents;
  } catch (error: any) {
    console.error('Falha ao buscar agentes:', error);
    throw new Error(error.message);
  }
}

export async function storeWebhookData(data: any): Promise<void> {
  const webhookDocRef = doc(db, 'webhook_data', 'latest');
  await setDoc(webhookDocRef, { payload: data, timestamp: new Date() });
}

export async function fetchLatestWebhook(): Promise<any | undefined> {
  const webhookDocRef = doc(db, 'webhook_data', 'latest');
  const docSnap = await getDoc(webhookDocRef);
  if (docSnap.exists()) {
    return docSnap.data().payload;
  }
  return undefined;
}

export async function updateAgentsState(agents: Agent[]): Promise<void> {
  for (const agent of agents) {
    const agentDocRef = doc(db, 'agents', agent.id);
    await setDoc(agentDocRef, agent, { merge: true });
  }
}

export async function getAgentsState(): Promise<Agent[]> {
  const agentsCollectionRef = collection(db, 'agents');
  const agentsSnapshot = await getDocs(agentsCollectionRef);
  const agents: Agent[] = [];
  agentsSnapshot.forEach(doc => {
    agents.push(doc.data() as Agent);
  });
  return agents;
}