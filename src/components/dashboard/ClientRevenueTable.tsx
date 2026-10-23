import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import { Users } from "lucide-react";

export interface ClientRevenueItem {
  id: string;
  name: string;
  billed: number;
  tax: number;
  net: number;
}

interface ClientRevenueTableProps {
  clients: ClientRevenueItem[];
}

export function ClientRevenueTable({ clients }: ClientRevenueTableProps) {
  const { showValues } = usePrivacyStore();

  const formatCurrency = (value: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const grandTotalBilled = clients.reduce((acc, c) => acc + c.billed, 0);
  const grandTotalTax = clients.reduce((acc, c) => acc + c.tax, 0);
  const grandTotalNet = clients.reduce((acc, c) => acc + c.net, 0);

  // Ordena os clientes por maior faturamento primeiro
  const sortedClients = [...clients].sort((a, b) => b.billed - a.billed);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle className="text-base sm:text-lg font-bold">Faturamento por Cliente no Mês</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} com receita
        </span>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Cliente</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Faturado (Bruto)</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Imposto Estimado</TableHead>
                <TableHead className="text-right font-semibold text-emerald-400">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                    Nenhum faturamento registrado para o mês selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{client.name}</TableCell>
                    <TableCell className="text-right text-sm text-foreground font-medium">
                      {formatCurrency(client.billed)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-destructive/80 font-medium">
                      {formatCurrency(client.tax)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-emerald-400">
                      {formatCurrency(client.net)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Totalizador Geral */}
              {sortedClients.length > 0 && (
                <TableRow className="border-t-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-bold">
                  <TableCell className="text-sm uppercase tracking-wide text-primary font-bold">
                    Total Geral ({sortedClients.length})
                  </TableCell>
                  <TableCell className="text-right text-sm text-foreground font-bold">
                    {formatCurrency(grandTotalBilled)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-destructive/90 font-bold">
                    {formatCurrency(grandTotalTax)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-400 font-bold">
                    {formatCurrency(grandTotalNet)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
