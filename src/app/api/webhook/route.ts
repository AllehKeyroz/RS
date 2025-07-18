import { NextResponse } from 'next/server';
import { processWebhook } from '@/app/actions';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Processa o webhook para selecionar um agente e atualizar o estado
    const { selectedAgent } = await processWebhook(payload);

    if (selectedAgent) {
        return NextResponse.json({ selectedAgent: selectedAgent });
    } else {
        return NextResponse.json({ selectedAgent: "Nenhum agente disponível" }, { status: 404 });
    }

  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Erro ao processar o corpo da requisição.', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
    return NextResponse.json({ message: "Endpoint de webhook pronto para receber requisições POST." });
}