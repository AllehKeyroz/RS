import { promises as fs } from 'fs';
import path from 'path';
const WEBHOOK_FILE = path.join(process.cwd(), 'data', 'webhook.json');
const CUSTOM_WEBHOOK_CONFIG_FILE = path.join(process.cwd(), 'data', 'customWebhookConfig.json');

export type CustomWebhookConfig = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
};

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

export async function saveCustomWebhookConfig(config: CustomWebhookConfig): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(CUSTOM_WEBHOOK_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getCustomWebhookConfig(): Promise<CustomWebhookConfig | undefined> {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(CUSTOM_WEBHOOK_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined; // File not found, return undefined
    }
    console.error('Failed to read custom webhook config file:', error);
    throw error;
  }
}