import { promises as fs } from 'fs';
import path from 'path';
import { Agent } from '../types';

const AGENTS_FILE = path.join(process.cwd(), 'data', 'agents.json');
const WEBHOOK_FILE = path.join(process.cwd(), 'data', 'webhook.json');

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists, or other error
    if (error.code !== 'EEXIST') {
      console.error('Failed to create data directory:', error);
      throw error;
    }
  }
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

export async function getSavedAgents(): Promise<Agent[]> {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // File not found, return empty array
    }
    console.error('Failed to read agents file:', error);
    throw error;
  }
}

export async function saveWebhookData(data: any): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(WEBHOOK_FILE, JSON.stringify(data, null, 2));
}

export async function getSavedWebhookData(): Promise<any | undefined> {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(WEBHOOK_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined; // File not found, return undefined
    }
    console.error('Failed to read webhook file:', error);
    throw error;
  }
}