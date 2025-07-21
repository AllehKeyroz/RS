"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Copy, Check as CheckIcon, Save, Settings, User, Mail, Phone, CalendarIcon, Info } from 'lucide-react';
import { fetchLatestWebhook, saveCustomWebhookConfig, getCustomWebhookConfig, executeCustomWebhook } from './actions';
import { CustomWebhookConfig } from '../lib/persistence';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

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
  status: string;
  timestamp: string;
};

export default function Home() {
  const [webhookResponse, setWebhookResponse] = useState<WebhookData | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [customWebhookConfig, setCustomWebhookConfig] = useState<CustomWebhookConfig>({
    method: 'POST',
    url: '',
    headers: {},
    body: '',
  });
  const [isCustomWebhookConfigLoading, setIsCustomWebhookConfigLoading] = useState(true);
  const [isSavingCustomWebhookConfig, setIsSavingCustomWebhookConfig] = useState(false);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/webhook`;
      setWebhookUrl(url);
    }
    const loadInitialData = async () => {
        setIsCustomWebhookConfigLoading(true);
        const storedConfig = await getCustomWebhookConfig();
        if (storedConfig) {
          setCustomWebhookConfig(storedConfig);
        }
        setIsCustomWebhookConfigLoading(false);
    };
    loadInitialData();
  }, []);

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

  const handleSaveCustomWebhookConfig = async () => {
    setIsSavingCustomWebhookConfig(true);
    try {
      await saveCustomWebhookConfig(customWebhookConfig);
      toast({
        title: "Sucesso!",
        description: "As configurações do webhook personalizado foram salvas.",
      });
      setIsSettingsOpen(false);
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e.message || "Não foi possível salvar as configurações do webhook personalizado.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCustomWebhookConfig(false);
    }
  };

  const loadWebhookData = useCallback(async () => {
    try {
      setIsLoadingWebhook(true);
      const data = await fetchLatestWebhook();
      setWebhookResponse(data || null);
    } catch (e: any) {
      console.error("Falha ao buscar dados do webhook:", e);
      setWebhookResponse(null);
    } finally {
      setIsLoadingWebhook(false);
    }
  },[]);

  useEffect(() => {
    loadWebhookData();
  }, [loadWebhookData]);

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
              <DialogTitle>Configuração do Webhook Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="webhook-method" className="text-sm font-medium mb-2">Método HTTP</Label>
                <Select
                  value={customWebhookConfig.method}
                  onValueChange={(value) => setCustomWebhookConfig({ ...customWebhookConfig, method: value })}
                >
                  <SelectTrigger id="webhook-method" className="w-full">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="webhook-url" className="text-sm font-medium mb-2">URL</Label>
                <Input
                  id="webhook-url"
                  value={customWebhookConfig.url}
                  onChange={(e) => setCustomWebhookConfig({ ...customWebhookConfig, url: e.target.value })}
                  placeholder="https://api.example.com/webhook"
                />
              </div>
              <div>
                <Label htmlFor="webhook-headers" className="text-sm font-medium mb-2">Cabeçalhos (JSON)</Label>
                <Textarea
                  id="webhook-headers"
                  value={JSON.stringify(customWebhookConfig.headers, null, 2)}
                  onChange={(e) => {
                    try {
                      setCustomWebhookConfig({ ...customWebhookConfig, headers: JSON.parse(e.target.value) });
                    } catch (error) {
                      // Handle invalid JSON input
                      console.error("Invalid JSON for headers:", error);
                    }
                  }}
                  placeholder='{ "Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN" }'
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="webhook-body" className="text-sm font-medium mb-2">Corpo da Requisição (JSON)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use placeholders como `{{leadData.firstName}}`, `{{leadData.email}}`, `{{leadData.phone}}` para dados do webhook original.
                </p>
                <Textarea
                  id="webhook-body"
                  value={customWebhookConfig.body}
                  onChange={(e) => setCustomWebhookConfig({ ...customWebhookConfig, body: e.target.value })}
                  placeholder='{ "name": "{{leadData.name}}", "email": "{{leadData.email}}" }'
                  rows={10}
                />
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
            <DialogFooter>
              <Button onClick={handleSaveCustomWebhookConfig} disabled={isSavingCustomWebhookConfig || isCustomWebhookConfigLoading}>
                  {isSavingCustomWebhookConfig ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Salvar Configuração</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <header className="mb-8 text-center">
          <h1 className="font-headline text-5xl tracking-tight">Painel de Webhook Personalizado</h1>
          <p className="text-muted-foreground mt-2 text-lg">Monitore os últimos webhooks recebidos.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <span className="text-muted-foreground">{webhookResponse.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="text-muted-foreground" />
                      <span className="text-muted-foreground">{format(new Date(webhookResponse.timestamp), "dd/MM/yyyy 'às' HH:mm")}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum lead recebido ainda.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
