import { NextRequest, NextResponse } from 'next/server';
import { storeWebhookData, executeCustomWebhook } from '../../actions';

export async function POST(req: NextRequest) {
  try {
    const leadData = await req.json();
    console.log('Webhook received:', leadData);

    let statusMessage = "Webhook recebido. Processando requisição personalizada...";

    try {
      await executeCustomWebhook(leadData);
      statusMessage += " Requisição personalizada executada com sucesso.";
    } catch (error: any) {
      statusMessage += ` Erro ao executar requisição personalizada: ${error.message}`;
      console.error('Erro ao executar webhook personalizado:', error);
    }

    const webhookToStore = {
      leadData: leadData,
      status: statusMessage,
      timestamp: new Date().toISOString(),
    };

    await storeWebhookData(webhookToStore);

    return NextResponse.json({
      message: 'Webhook processado',
      status: webhookToStore.status
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook', details: error.message }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ message: "Endpoint de webhook pronto para receber requisições POST." });
}