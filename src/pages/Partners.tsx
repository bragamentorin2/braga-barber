import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/contexts/FinanceContext";
import { Trash2, Plus, History } from "lucide-react";
import { toast } from "sonner";
import type { Partner, PartnerContract } from "@/types/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseProvisionsList } from "@/components/finance/ExpenseProvisionsList";

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value: id, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonthId(monthId: string) {
  const [year, month] = monthId.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

interface ContractHistoryDialogProps {
  partner: Partner;
  contracts: PartnerContract[];
  onAdd: (partnerId: string, amount: number, startMonthId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContractHistoryDialog({ partner, contracts, onAdd, onDelete, open, onOpenChange }: ContractHistoryDialogProps) {
  const monthOptions = getMonthOptions();
  const [amount, setAmount] = useState("");
  const [startMonthId, setStartMonthId] = useState(monthOptions[2].value);
  const [saving, setSaving] = useState(false);

  const partnerContracts = contracts
    .filter(c => c.partnerId === partner.id)
    .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));

  const handleAdd = async () => {
    const numAmount = parseFloat(amount.replace(",", "."));
    if (!numAmount || numAmount <= 0) { toast.error("Informe um valor valido."); return; }
    setSaving(true);
    await onAdd(partner.id, numAmount, startMonthId);
    setAmount("");
    setSaving(false);
    toast.success("Contrato adicionado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historico de Pro-labore - {partner.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-4">
            <h4 className="font-medium text-sm">Novo Contrato / Reajuste</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 5000" />
              </div>
              <div className="space-y-1">
                <Label>Mes de Inicio</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={startMonthId}
                  onChange={e => setStartMonthId(e.target.value)}
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleAdd} disabled={saving} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Historico de Contratos</h4>
            {partnerContracts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhum contrato cadastrado.</p>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Mes de Inicio</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerContracts.map((c, idx) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span className="capitalize">{formatMonthId(c.startMonthId)}</span>
                        {idx === 0 && <span className="ml-2 text-xs font-medium text-emerald-500 border border-emerald-500 rounded-full px-2 py-0.5">Atual</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={async () => { if (window.confirm("Excluir este contrato?")) { await onDelete(c.id); toast.success("Contrato excluido."); } }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPartnerDialog({ onAdd }: { onAdd: (name: string, amount: number, startMonthId: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const monthOptions = getMonthOptions();
  const [startMonthId, setStartMonthId] = useState(monthOptions[2].value);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Informe o nome do socio."); return; }
    const numAmount = parseFloat(amount.replace(",", "."));
    if (!numAmount || numAmount <= 0) { toast.error("Informe um valor valido."); return; }
    setSaving(true);
    await onAdd(name.trim(), numAmount, startMonthId);
    setName(""); setAmount(""); setSaving(false); setOpen(false);
    toast.success("Socio cadastrado com sucesso!");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Socio</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Socio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nome do Socio</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Joao Silva" />
            </div>
            <div className="space-y-1">
              <Label>Pro-labore Mensal (R$)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 5000" />
            </div>
            <div className="space-y-1">
              <Label>Mes de Inicio</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={startMonthId} onChange={e => setStartMonthId(e.target.value)}
              >
                {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Partners() {
  const { partners, partnerContracts, addPartner, deletePartner, addPartnerContract, deletePartnerContract } = useFinance();
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);

  const handleAddPartner = async (name: string, amount: number, startMonthId: string) => {
    await addPartner({ name }, amount, startMonthId);
  };

  const handleDeletePartner = async (id: string) => {
    if (window.confirm("Excluir este socio e todos os seus contratos?")) {
      await deletePartner(id);
      toast.success("Socio excluido.");
    }
  };

  const getActiveContract = (partnerId: string): PartnerContract | undefined => {
    const now = new Date();
    const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const pcs = partnerContracts
      .filter(c => c.partnerId === partnerId && c.startMonthId <= currentMonthId)
      .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));
    return pcs[0];
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Socios & Pro-labore</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie socios e seus contratos de pro-labore. Os valores sao lancados automaticamente no Financeiro a cada mes.
            </p>
          </div>
          <AddPartnerDialog onAdd={handleAddPartner} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Socios Cadastrados</CardTitle></CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg mb-2">Nenhum socio cadastrado</p>
                <p className="text-sm">Clique em Novo Socio para comecar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map(partner => {
                  const active = getActiveContract(partner.id);
                  const contractCount = partnerContracts.filter(c => c.partnerId === partner.id).length;
                  return (
                    <div key={partner.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-semibold">{partner.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Pro-labore atual: <span className="font-medium text-foreground">{active ? formatCurrency(active.amount) : "-"}</span>
                          {active && <span className="ml-2 text-xs">(desde {formatMonthId(active.startMonthId)})</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{contractCount} contrato{contractCount !== 1 ? "s" : ""} no historico</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setHistoryPartner(partner)}>
                          <History className="h-4 w-4" />Contratos
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => handleDeletePartner(partner.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {historyPartner && (
          <ContractHistoryDialog
            partner={historyPartner}
            contracts={partnerContracts}
            onAdd={addPartnerContract}
            onDelete={deletePartnerContract}
            open={!!historyPartner}
            onOpenChange={open => { if (!open) setHistoryPartner(null); }}
          />
        )}

        <ExpenseProvisionsList />
      </div>
    </AppLayout>
  );
}
