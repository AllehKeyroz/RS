import { NextRequest, NextResponse } from 'next/server';
import { storeWebhookData, getAgentsState, updateAgentsState, getDistributionEnabled } from '../../actions';

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