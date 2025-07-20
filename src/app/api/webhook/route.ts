import { NextRequest, NextResponse } from 'next/server';
import { storeWebhookData, getAgentsState, updateAgentsState, getDistributionEnabled, getApiKey } from '../../actions';

async function updateGoHighLevelContact(contactId: string, assignedAgentId: string, apiKey: string): Promise<void> {
  const url = `https://services.leadconnectorhq.com/contacts/${contactId}`;
  const headers = {
    'Version': '2021-04-15',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    assignedTo: assignedAgentId,
  });

  const response = await fetch(url, {
    method: 'PUT',
    headers: headers,
    body: body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao atualizar contato ${contactId} no GoHighLevel: ${response.status} ${response.statusText} - ${errorBody}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const leadData = await req.json();
    console.log('Webhook received:', leadData);

    const distributionEnabled = await getDistributionEnabled();

    let agents = await getAgentsState();

    let assignedAgent = null;
    let assignmentStatus = "";

    if (!distributionEnabled) {
      assignmentStatus = 'Distribuição de leads desativada. Lead recebido, mas não atribuído.';
      console.log(assignmentStatus);
    } else {
      // Filter for available agents with distribution percentage > 0
      const availableAgents = agents.filter(
        (agent) => agent.isAvailable && agent.distributionPercentage > 0
      );

      if (availableAgents.length === 0) {
        assignmentStatus = 'Nenhum agente disponível para atribuição.';
        console.log(assignmentStatus);
      } else {
        const totalDistribution = availableAgents.reduce(
          (sum, agent) => sum + agent.distributionPercentage,
          0
        );

        if (totalDistribution === 0) {
          assignmentStatus = 'Distribuição total é 0. Atribuindo aleatoriamente.';
          console.log(assignmentStatus);
          const randomIndex = Math.floor(Math.random() * availableAgents.length);
          assignedAgent = availableAgents[randomIndex];
        } else {
          let random = Math.random() * totalDistribution;
          for (const agent of availableAgents) {
            random -= agent.distributionPercentage;
            if (random <= 0) {
              assignedAgent = agent;
              break;
            }
          }
          assignmentStatus = `Lead atribuído a ${assignedAgent?.name}`;
        }
      }
    }

    if (assignedAgent) {
      const agentIndex = agents.findIndex((agent) => agent.id === assignedAgent.id);
      if (agentIndex !== -1) {
        agents[agentIndex].leadCount += 1;
        await updateAgentsState(agents);

        // Attempt to update GoHighLevel contact
        const apiKey = await getApiKey();
        const contactId = leadData.id; // Correctly extracting contact ID from top-level leadData

        if (apiKey && contactId) {
          try {
            await updateGoHighLevelContact(contactId, assignedAgent.id, apiKey);
            console.log(`Contato ${contactId} atualizado no GoHighLevel com agente ${assignedAgent.name}`);
          } catch (updateError: any) {
            console.error('Erro ao atualizar contato no GoHighLevel:', updateError);
            assignmentStatus += ` (Erro ao atualizar GHL: ${updateError.message})`;
          }
        } else {
          console.warn('Não foi possível atualizar contato no GoHighLevel: Chave de API ou ID do contato ausente.');
          assignmentStatus += ' (Não foi possível atualizar GHL: API Key ou Contact ID ausente)';
        }
      }
    } else if (distributionEnabled) {
      // If distribution is enabled but no agent could be assigned
      assignmentStatus = 'Nenhum agente pôde ser atribuído.';
    }

    const webhookToStore = {
      leadData: leadData,
      assignment: {
        assignedAgentName: assignedAgent?.name || 'N/A',
        assignedAgentId: assignedAgent?.id || 'N/A',
        status: assignmentStatus,
        timestamp: new Date().toISOString(),
      },
    };

    await storeWebhookData(webhookToStore);

    return NextResponse.json({
      message: 'Webhook processado',
      assignment: webhookToStore.assignment
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook', details: error.message }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ message: "Endpoint de webhook pronto para receber requisições POST." });
}