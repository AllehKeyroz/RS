import { NextRequest, NextResponse } from 'next/server';
import { storeWebhookData, getAgentsState, updateAgentsState } from '../../actions';
import { Qualification } from '../../../types';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Webhook received:', data);

    await storeWebhookData(data);

    let agents = await getAgentsState();

    // Determine qualification based on percentages
    const rand = Math.random() * 100;
    let targetQualification: Qualification;

    if (rand < 40) {
      targetQualification = Qualification.LIDER; // 40%
    } else if (rand < 70) {
      targetQualification = Qualification.EXPERT; // 30% (40 + 30 = 70)
    } else if (rand < 90) {
      targetQualification = Qualification.RAZOAVEL; // 20% (70 + 20 = 90)
    } else {
      targetQualification = Qualification.INICIANTE; // 10% (90 + 10 = 100)
    }

    const availableAgentsInQualification = agents.filter(
      (agent) => agent.isAvailable && agent.qualification === targetQualification
    );

    let assignedAgent = null;

    if (availableAgentsInQualification.length > 0) {
      // Randomly select an agent from the available ones in the target qualification
      const randomIndex = Math.floor(Math.random() * availableAgentsInQualification.length);
      assignedAgent = availableAgentsInQualification[randomIndex];

      // Increment lead count for the assigned agent in the main agents array
      const agentIndex = agents.findIndex((agent) => agent.id === assignedAgent?.id);
      if (agentIndex !== -1) {
        agents[agentIndex].leadCount += 1;
      }
      await updateAgentsState(agents); // Save the updated state

      console.log(`Lead assigned to: ${assignedAgent.name} (Qualification: ${assignedAgent.qualification})`);
      return NextResponse.json({ message: 'Webhook received and lead assigned', assignedAgent: assignedAgent.name }, { status: 200 });
    } else {
      console.log(`No available agents in ${targetQualification} qualification to assign lead.`);
      // Fallback: if no agents in the target qualification, try to assign to any available agent
      const anyAvailableAgents = agents.filter(agent => agent.isAvailable);
      if (anyAvailableAgents.length > 0) {
        const randomIndex = Math.floor(Math.random() * anyAvailableAgents.length);
        assignedAgent = anyAvailableAgents[randomIndex];

        const agentIndex = agents.findIndex((agent) => agent.id === assignedAgent?.id);
        if (agentIndex !== -1) {
          agents[agentIndex].leadCount += 1;
        }
        await updateAgentsState(agents); // Save the updated state
        console.log(`No agents in ${targetQualification}, lead assigned to any available agent: ${assignedAgent.name}`);
        return NextResponse.json({ message: 'Webhook received and lead assigned to any available agent', assignedAgent: { name: assignedAgent.name, id: assignedAgent.id } }, { status: 200 });
      } else {
        console.log('No available agents at all to assign lead.');
        return NextResponse.json({ message: 'No available agents to assign lead' }, { status: 200 });
      }
    }

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook', details: error.message }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ message: "Endpoint de webhook pronto para receber requisições POST." });
}