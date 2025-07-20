import { promises as fs } from 'fs';
import path from 'path';
import { Agent } from '../types';

const AGENTS_FILE = path.join(process.cwd(), 'data', 'agents.json');
const WEBHOOK_FILE = path.join(process.cwd(), 'data', 'webhook.json');
const DISTRIBUTION_SETTINGS_FILE = path.join(process.cwd(), 'data', 'distributionSettings.json');
const BEARER_TOKEN_FILE = path.join(process.cwd(), 'data', 'bearerToken.json');

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

export async function saveDistributionSettings(enabled: boolean): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(DISTRIBUTION_SETTINGS_FILE, JSON.stringify({ isDistributionEnabled: enabled }, null, 2));
}

export async function getDistributionSettings(): Promise<{ isDistributionEnabled: boolean }> {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(DISTRIBUTION_SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { isDistributionEnabled: true }; // Default to enabled if file not found
    }
    console.error('Failed to read distribution settings file:', error);
    throw error;
  }
}

export async function saveBearerToken(token: string): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(BEARER_TOKEN_FILE, JSON.stringify({ bearerToken: token }, null, 2));
}

export async function getBearerToken(): Promise<string | undefined> {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(BEARER_TOKEN_FILE, 'utf8');
    return JSON.parse(data).bearerToken;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined; // File not found, return undefined
    }
    console.error('Failed to read bearer token file:', error);
    throw error;
  }
}