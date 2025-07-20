"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertCircle, RefreshCw, Copy, Check as CheckIcon, KeyRound, Save, AlertTriangle, CheckCircle2, Users, Settings, User, Mail, Phone, CalendarIcon, Info } from 'lucide-react';
import { fetchAgents, fetchLatestWebhook, storeApiKey, getApiKey, updateAgentsState, getAgentsState, storeDistributionEnabled, getDistributionEnabled } from './actions';
import { type Agent } from '../types';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Define a type for the structured webhook data
type WebhookData = {
  leadData: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any; // Allow other properties
  };
  assignment: {
    assignedAgentName: string;
    timestamp: string;
    status: string;
  };
};

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [webhookResponse, setWebhookResponse] = useState<WebhookData | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnavailableAgents, setShowUnavailableAgents] = useState(true);
  const [isDistributionEnabled, setIsDistributionEnabled] = useState(true);
  
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return 0;
  });

  const visibleAgents = showUnavailableAgents ? sortedAgents : sortedAgents.filter(a => a.isAvailable);

  const totalDistribution = agents.reduce((sum, agent) => sum + (agent.distributionPercentage || 0), 0);

  const loadAgentsFromState = useCallback(async () => {
      const stateAgents = await getAgentsState();
      if(stateAgents.length > 0){
          setAgents(stateAgents);
      }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/webhook`;
      setWebhookUrl(url);
    }
    const loadInitialData = async () => {
        const storedKey = await getApiKey();
        if (storedKey) {
            setApiKey(storedKey);
            await loadAgents(storedKey);
        } else {
            await loadAgentsFromState();
        }
        const distributionEnabled = await getDistributionEnabled();
        setIsDistributionEnabled(distributionEnabled);
    };
    loadInitialData();

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
      toast({
        title: "Chave de API necessária",
        description: "Por favor, insira uma chave de API.",
        variant: "destructive",
      });
      return;
    }
    await storeApiKey(apiKey);
    await storeDistributionEnabled(isDistributionEnabled);
    toast({
      title: "Sucesso!",
      description: "As configurações foram salvas.",
    });
    await loadAgents(apiKey);
    setIsSettingsOpen(false);
  };

  const loadAgents = async (key: string) => {
    try {
      setIsLoadingAgents(true);
      setError(null);
      const fetchedAgents = await fetchAgents(key);
      setAgents(fetchedAgents);
      await updateAgentsState(fetchedAgents);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar agentes.');
      setAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadWebhookData = useCallback(async () => {
    try {
      setIsLoadingWebhook(true);
      const data = await fetchLatestWebhook();
      setWebhookResponse(data || null);
      await loadAgentsFromState();
    } catch (e: any) {
      console.error("Falha ao buscar dados do webhook:", e);
      setWebhookResponse(null);
    } finally {
      setIsLoadingWebhook(false);
    }
  },[loadAgentsFromState]);

  useEffect(() => {
    loadWebhookData();
  }, [loadWebhookData]);

  const handleAgentUpdate = (agentId: string, field: keyof Agent, value: string | boolean | number) => {
    const updatedAgents = agents.map(agent => {
        if (agent.id === agentId) {
          let updatedValue = value;
          if (field === 'leadCount' || field === 'distributionPercentage') {
            updatedValue = parseInt(value as string, 10);
            if (isNaN(updatedValue)) {
              updatedValue = 0;
            }
          }
          return { ...agent, [field]: updatedValue };
        }
        return agent;
      });
    setAgents(updatedAgents);
    updateAgentsState(updatedAgents);
  };

  const handleDistributeEvenly = () => {
    const availableAgents = agents.filter(agent => agent.isAvailable);
    if (availableAgents.length === 0) {
      toast({
        title: "Nenhum agente disponível",
        description: "Não há agentes disponíveis para distribuir a porcentagem.",
        variant: "destructive",
      });
      return;
    }

    const totalPercentage = 100;
    const basePercentage = Math.floor(totalPercentage / availableAgents.length);
    let remainder = totalPercentage % availableAgents.length;

    const updatedAgents = agents.map(agent => {
      if (agent.isAvailable) {
        let percentage = basePercentage;
        if (remainder > 0) {
          percentage++;
          remainder--;
        }
        return { ...agent, distributionPercentage: percentage };
      } else {
        return { ...agent, distributionPercentage: 0 };
      }
    });

    setAgents(updatedAgents);
    updateAgentsState(updatedAgents);

    toast({
      title: "Distribuição Aplicada",
      description: `A porcentagem foi dividida igualmente entre ${availableAgents.length} agentes disponíveis.`,
    });
  };

  const Title = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-headline text-3xl text-info border-b-2 border-info/50 pb-3 mb-6">
      {children}
    </h2>
  );
  
  return (
    <main className="flex min-h-screen w-full flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-7xl relative">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-0 right-0 m-4">
              <Settings className="h-6 w-6" />
              <span className="sr-only">Abrir Configurações</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configuração</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="distribution-toggle" className="text-sm font-medium">Ativar Distribuição de Leads</Label>
                <Switch
                  id="distribution-toggle"
                  checked={isDistributionEnabled}
                  onCheckedChange={setIsDistributionEnabled}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveAndLoad} disabled={isLoadingAgents}>
                  {isLoadingAgents ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Salvar e Carregar</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <header className="mb-8 text-center">
          <h1 className="font-headline text-5xl tracking-tight">Painel de Distribuição de Leads</h1>
          <p className="text-muted-foreground mt-2 text-lg">Monitore agentes e a chegada de novos leads.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Lead Info */}
          <div className="lg:col-span-1">
            <Card className="border-border/60 shadow-2xl shadow-black/20 h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Último Lead Recebido
                  <Button onClick={loadWebhookData} disabled={isLoadingWebhook} variant="outline" size="icon">
                     <RefreshCw className={`h-4 w-4 ${isLoadingWebhook ? 'animate-spin' : ''}`} />
                     <span className="sr-only">Atualizar</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWebhook ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-10 w-1/2 mt-4" />
                  </div>
                ) : webhookResponse ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="text-muted-foreground" />
                      <span className="font-semibold text-lg">{webhookResponse.leadData.name || `${webhookResponse.leadData.firstName} ${webhookResponse.leadData.lastName}` || 'Nome não disponível'}</span>
                    </div>
                    {webhookResponse.leadData.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="text-muted-foreground" />
                        <span className="text-muted-foreground">{webhookResponse.leadData.email}</span>
                      </div>
                    )}
                    {webhookResponse.leadData.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="text-muted-foreground" />
                        <span className="text-muted-foreground">{webhookResponse.leadData.phone}</span>
                      </div>
                    )}
                    <div className="border-t border-border/60 my-4"></div>
                    <div className="flex items-center gap-3">
                      <Info className="text-muted-foreground" />
                      <span className="text-muted-foreground">{webhookResponse.assignment.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="text-muted-foreground" />
                      <span className="text-muted-foreground">{format(new Date(webhookResponse.assignment.timestamp), "dd/MM/yyyy 'às' HH:mm")}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum lead recebido ainda.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Agents Table */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 shadow-2xl shadow-black/20 h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Status dos Agentes
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="show-unavailable" checked={showUnavailableAgents} onCheckedChange={setShowUnavailableAgents} />
                      <Label htmlFor="show-unavailable" className="text-sm font-normal">Mostrar indisponíveis</Label>
                    </div>
                    <Button onClick={handleDistributeEvenly} variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Distribuir Igualmente
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAgents ? (
                  <div className="space-y-2 pt-4">
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
                  <div>
                     <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Disponível</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-[150px]">Distribuição (%)</TableHead>
                          <TableHead className="text-center">Leads</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleAgents.map((agent) => (
                          <TableRow key={agent.id} className={!agent.isAvailable ? 'opacity-50' : ''}>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={agent.isAvailable}
                                onCheckedChange={(checked) => handleAgentUpdate(agent.id, 'isAvailable', !!checked)}
                                className="scale-125"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{agent.name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={agent.distributionPercentage || 0}
                                onChange={(e) => handleAgentUpdate(agent.id, 'distributionPercentage', e.target.value)}
                                className="w-24 text-center bg-secondary"
                                min="0"
                                max="100"
                                disabled={!agent.isAvailable}
                              />
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">
                              {agent.leadCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 text-right pr-4">
                        <div className={`flex items-center justify-end font-bold text-lg p-2 rounded-md ${totalDistribution === 100 ? 'text-green-500' : 'text-destructive'}`}>
                            {totalDistribution === 100 ? <CheckCircle2 className="mr-2" /> : <AlertTriangle className="mr-2" />}
                            <span>Total: {totalDistribution}%</span>
                        </div>
                        {totalDistribution !== 100 && (
                            <p className="text-xs text-destructive mt-1">A soma das porcentagens de distribuição dos agentes disponíveis deve ser 100%.</p>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
