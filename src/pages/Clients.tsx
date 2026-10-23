import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { EditClientDialog } from '@/components/clients/EditClientDialog';
import { ManageContractsDialog } from '@/components/clients/ManageContractsDialog';
import { Trash2, Search, Phone, Calendar, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { monthIdToLabel } from '@/components/ui/MonthYearPicker';

export function Clients() {
  const { clients, clientContracts, deleteClient, loading } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');

  const getClientLatestValue = (clientId: string, defaultBase?: number) => {
    const contracts = clientContracts.filter((c) => c.clientId === clientId);
    if (contracts.length === 0) return defaultBase || 0;
    contracts.sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));
    return contracts[0].amount;
  };

  const getFirstContractDate = (clientId: string) => {
    const contracts = clientContracts.filter((c) => c.clientId === clientId);
    if (contracts.length === 0) return '-';
    contracts.sort((a, b) => a.startMonthId.localeCompare(b.startMonthId));
    return monthIdToLabel(contracts[0].startMonthId);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) {
      await deleteClient(id);
      toast.success(`Cliente ${name} excluído com sucesso!`);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  return (
    <AppLayout actions={<AddClientDialog />}>
      <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>
        <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border-border bg-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl font-bold">Clientes Cadastrados</CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>

            {/* Barra de Busca rápida */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/20 border-border"
              />
            </div>
          </CardHeader>

          {/* Cabeçalho da Lista */}
          <div className="grid bg-muted/60 border-b border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground items-center grid-cols-[1fr_120px] sm:grid-cols-[1.5fr_1.2fr_1fr_1fr_110px]">
            <span>Cliente</span>
            <span className="hidden sm:block">Contato</span>
            <span className="text-right sm:text-left hidden sm:block">Faturamento Base</span>
            <span className="text-center hidden sm:block">Início</span>
            <span className="text-right">Ações</span>
          </div>

          {/* Corpo com Scrollbar padrão do projeto */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid px-4 py-3.5 border-b border-border/50 items-center grid-cols-[1fr_120px] sm:grid-cols-[1.5fr_1.2fr_1fr_1fr_110px]"
                  >
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28 hidden sm:block" />
                    <Skeleton className="h-4 w-24 hidden sm:block" />
                    <Skeleton className="h-4 w-20 mx-auto hidden sm:block" />
                    <Skeleton className="h-7 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Users className="w-8 h-8 opacity-40" />
                <p>
                  {searchTerm
                    ? 'Nenhum cliente encontrado com este filtro de busca.'
                    : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" acima.'}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const latestAmount = getClientLatestValue(client.id, client.defaultBaseValue);
                const startDate = getFirstContractDate(client.id);

                return (
                  <div
                    key={client.id}
                    className="grid px-4 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors grid-cols-[1fr_120px] sm:grid-cols-[1.5fr_1.2fr_1fr_1fr_110px]"
                  >
                    {/* Nome + Notas */}
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-sm text-foreground truncate" title={client.name}>
                        {client.name}
                      </div>
                      {client.notes && (
                        <p className="text-xs text-muted-foreground truncate" title={client.notes}>
                          {client.notes}
                        </p>
                      )}
                      {/* Mobile: Exibe telefone e valor abaixo do nome */}
                      <div className="sm:hidden text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                        {client.phone && <span>{client.phone}</span>}
                        <span className="font-medium text-emerald-400">{formatCurrency(latestAmount)}</span>
                      </div>
                    </div>

                    {/* Telefone / Contato */}
                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                      {client.phone ? (
                        <>
                          <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>

                    {/* Faturamento Base */}
                    <div className="hidden sm:block text-sm font-semibold text-emerald-400">
                      {formatCurrency(latestAmount)}
                    </div>

                    {/* Início */}
                    <div className="hidden sm:flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                      <span>{startDate}</span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-1">
                      <ManageContractsDialog client={client} />
                      <EditClientDialog client={client} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Excluir Cliente"
                        onClick={() => handleDelete(client.id, client.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
