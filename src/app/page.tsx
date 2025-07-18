"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertCircle, RefreshCw, Copy, Check as CheckIcon, KeyRound, Save } from 'lucide-react';
import { fetchAgents, fetchLatestWebhook, storeApiKey, getApiKey, updateAgentsState, getAgentsState } from './actions';
import { Qualification, type Agent } from '../types';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [webhookResponse, setWebhookResponse] = useState('Nenhum webhook recebido ainda. Dispare um evento da GoHighLevel para o endpoint da aplicação.');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAgentsFromState = useCallback(async () => {
      const stateAgents = await getAgentsState();
      setAgents(stateAgents);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/webhook`;
      setWebhookUrl(url);
    }
    const loadInitialKeyAndAgents = async () => {
        const storedKey = await getApiKey();
        if (storedKey) {
            setApiKey(storedKey);
            await loadAgents(storedKey);
        } else {
            await loadAgentsFromState();
        }
    };
    loadInitialKeyAndAgents();

     // Poll for agent state changes
    const interval = setInterval(loadAgentsFromState, 5000);
    return () => clearInterval(interval);

  }, [loadAgentsFromState]);

  const copyToClipboard = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setIsCopied(true);
      toast({
        title: "Copiado!",
        description: "A URL do webhook foi copiada para a área de transferência.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Falha ao copiar: ', err);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a URL.",
        variant: "destructive",
      });
    });
  };

  const handleSaveAndLoad = async () => {
    if (!apiKey) {
      setError("Por favor, insira uma chave de API.");
      setAgents([]);
      return;
    n    await storeApiKey(apiKey);
    toast({
      title: "Sucesso!",
      description: "A chave de API foi salva.",
    });
    await loadAgents(apiKey);
  };

  const loadAgents = async (key: string) => {
    try {
      setIsLoadingAgents(true);
      setError(null);
      const fetchedAgents = await fetchAgents(key);
      setAgents(fetchedAgents);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar agentes.');
      setAgents([]); // Clear agents on error
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadWebhookData = async () => {
    try {
      setIsLoadingWebhook(true);
      const data = await fetchLatestWebhook();
      if (data) {
        setWebhookResponse(JSON.stringify(data, null, 2));
      } else {
        setWebhookResponse('Nenhum webhook recebido ainda. Dispare um evento da GoHighLevel e clique em "Atualizar".');
      }
       await loadAgentsFromState(); // Refresh agent counts
    } catch (e: any) {
      setWebhookResponse(JSON.stringify({ error: 'Falha ao buscar dados do webhook.', details: e.message }, null, 2));
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  useEffect(() => {
    loadWebhookData(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgentUpdate = (agentId: string, field: keyof Agent, value: string | boolean) => {
    const updatedAgents = agents.map(agent => {
        if (agent.id === agentId) {
          const updatedValue = (field === 'leadCount')
            ? parseInt(value as string, 10) || 0
            : value;
          return { ...agent, [field]: updatedValue };
        }
        return agent;
      });
    setAgents(updatedAgents);
    updateAgentsState(updatedAgents); // Update the state on the server
  };

  const Title = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-headline text-3xl text-info border-b-2 border-info/50 pb-3 mb-6">
      {children}
    </h2>
  );
  
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="font-headline text-5xl tracking-tight">Painel de Distribuição de Leads</h1>
          <p className="text-muted-foreground mt-2 text-lg">Monitore agentes e a chegada de novos leads.</p>
        </header>

        <Card className="border-border/60 shadow-2xl shadow-black/20">
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 gap-y-10">
              
              {/* Left Column */}
              <div className="flex flex-col space-y-8">
                 <section>
                    <Title>Configuração</Title>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                                <KeyRound /> Chave da API GoHighLevel
                            </label>
                             <div className="flex items-center space-x-2">
                                <Input 
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua chave de API aqui"
                                    className="text-sm bg-secondary border-border/60"
                                />
                                <Button onClick={handleSaveAndLoad} disabled={isLoadingAgents}>
                                    {isLoadingAgents ? <Loader2 className="animate-spin" /> : <Save />}
                                    <span className="ml-2">Salvar e Carregar</span>
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2">Endpoint do Webhook</label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Use esta URL para configurar o webhook de "Contato Criado" na GoHighLevel.
                            </p>
                            <div className="flex items-center space-x-2">
                                <Input 
                                    readOnly 
                                    value={webhookUrl || "Carregando URL..."} 
                                    className="text-sm bg-secondary border-border/60"
                                />
                                <Button onClick={copyToClipboard} variant="outline" size="icon" disabled={!webhookUrl}>
                                    {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    <span className="sr-only">Copiar URL</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
                <section>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-headline text-2xl">Último Lead Recebido</h3>
                      <Button onClick={loadWebhookData} disabled={isLoadingWebhook} variant="outline" size="sm">
                         <RefreshCw className={`h-4 w-4 ${isLoadingWebhook ? 'animate-spin' : ''}`} />
                         <span className="ml-2">Atualizar</span>
                      </Button>
                    </div>
                    <pre className="bg-secondary p-4 rounded-md border border-border/60 text-sm font-code min-h-[260px] max-h-72 overflow-y-auto w-full">
                      {isLoadingWebhook ? <span className="text-muted-foreground">Buscando...</span> : <code>{webhookResponse}</code>}
                    </pre>
                </section>
              </div>

              {/* Right Column */}
              <div className="flex flex-col space-y-8">
                <section>
                  <Title>Status dos Agentes</Title>
                   
                  {isLoadingAgents ? (
                    <div className="space-y-2">
                       <p className="text-center text-muted-foreground flex items-center justify-center">
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Carregando agentes...
                       </p>
                       {[...Array(5)].map((_, i) => (
                         <div key={i} className="flex items-center space-x-4 p-2">
                            <Skeleton className="h-6 w-6 rounded-sm" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : error ? (
                    <div className="text-destructive-foreground bg-destructive/80 p-4 rounded-md flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3" />
                      <span>{error}</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Disponível</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Qualificação</TableHead>
                            <TableHead className="text-center">Leads</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agents.map((agent) => (
                            <TableRow key={agent.id}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={agent.isAvailable}
                                  onCheckedChange={(checked) => handleAgentUpdate(agent.id, 'isAvailable', !!checked)}
                                  className="scale-125"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{agent.name}</TableCell>
                              <TableCell>
                                <Select onValueChange={(value) => handleAgentUpdate(agent.id, 'qualification', value as Qualification)} value={agent.qualification}>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecione a qualificação" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.values(Qualification).map((qual) => (
                                      <SelectItem key={qual} value={qual}>
                                        {qual}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center font-bold text-lg">
                                {agent.leadCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}