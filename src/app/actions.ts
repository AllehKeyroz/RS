'use server';

import { saveWebhookData, getSavedWebhookData, getCustomWebhookConfig } from '../lib/persistence';
import { CustomWebhookConfig } from '../lib/persistence';





export async function storeWebhookData(data: any): Promise<void> {
  await saveWebhookData(data);
}

export async function fetchLatestWebhook(): Promise<any | undefined> {
  return await getSavedWebhookData();
}

export async function saveCustomWebhookConfig(config: CustomWebhookConfig): Promise<void> {
  await saveCustomWebhookConfig(config);
}

export async function getCustomWebhookConfig(): Promise<CustomWebhookConfig | undefined> {
  return await getCustomWebhookConfig();
}

export async function executeCustomWebhook(leadData: any): Promise<void> {
  const config = await getCustomWebhookConfig();

  if (!config || !config.url) {
    console.warn("Configuração de webhook personalizado não encontrada ou URL ausente.");
    return;
  }

  // Replace placeholders in URL, headers, and body
  let processedUrl = config.url;
  let processedHeaders = { ...config.headers };
  let processedBody = config.body;

  // Simple placeholder replacement (can be expanded for nested objects)
  for (const key in leadData) {
    const placeholder = new RegExp(`{{\s*leadData\.${key}\s*}}`, 'g');
    if (typeof leadData[key] === 'string') {
      processedUrl = processedUrl.replace(placeholder, leadData[key]);
      processedBody = processedBody.replace(placeholder, leadData[key]);
    }
  }

  // Replace placeholders in headers
  for (const headerKey in processedHeaders) {
    for (const dataKey in leadData) {
      const placeholder = new RegExp(`{{\s*leadData\.${dataKey}\s*}}`, 'g');
      if (typeof processedHeaders[headerKey] === 'string') {
        processedHeaders[headerKey] = processedHeaders[headerKey].replace(placeholder, leadData[dataKey]);
      }
    }
  }

  try {
    const response = await fetch(processedUrl, {
      method: config.method,
      headers: processedHeaders,
      body: processedBody,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Falha ao executar webhook personalizado: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    console.log("Webhook personalizado executado com sucesso.", await response.text());
  } catch (error: any) {
    console.error("Erro ao executar webhook personalizado:", error);
    throw error;
  }
}