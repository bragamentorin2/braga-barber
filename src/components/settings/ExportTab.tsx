import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS_PT = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const YEARS = Array.from({ length: 2050 - 2026 + 1 }, (_, i) => String(2026 + i));

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function toMonthId(year: string, month: string) {
  return `${year}-${month}`;
}

export function ExportTab() {
  const { months, expenses, getInitialBalance, getMonthRevenues, getMonthProlabores, getMonthProvisions, getMonthPLProvisions, clients } = useFinance();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [startMonth, setStartMonth] = useState(String(now.getMonth() - 5 > 0 ? now.getMonth() - 4 : 1).padStart(2, '0'));
  const [endMonth, setEndMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const startMonthId = toMonthId(selectedYear, startMonth);
  const endMonthId = toMonthId(selectedYear, endMonth);

  const buildReportData = () => {
    const allMonthIds = months
      .map(m => m.id)
      .filter(id => id >= startMonthId && id <= endMonthId)
      .sort();

    return allMonthIds.map(mId => {
      const month = months.find(m => m.id === mId)!;
      const revs = getMonthRevenues(mId);
      const prolabores = getMonthProlabores(mId);
      const provisions = getMonthProvisions(mId);
      const plProvisions = getMonthPLProvisions(mId);
      const regularExpenses = expenses.filter(e => e.monthId === mId && e.category !== 'FP');
      const allExps = [...regularExpenses, ...prolabores, ...provisions, ...plProvisions];

      const totalRevenue = revs.reduce((a, r) => a + r.amount, 0);
      const totalTax = revs.reduce((a, r) => a + r.tax, 0);
      const totalExpenses = allExps.reduce((a, e) => a + e.amount, 0);
      const initialBalance = getInitialBalance(mId);
      const netBalance = Math.round((initialBalance + (totalRevenue - totalTax) - totalExpenses) * 100) / 100;

      return {
        monthId: mId,
        monthLabel: month?.label || mId,
        initialBalance,
        totalRevenue,
        totalTax,
        netRevenue: totalRevenue - totalTax,
        totalExpenses,
        netBalance,
        revenues: revs.map(r => ({
          client: clients.find(c => c.id === r.clientId)?.name || 'Desconhecido',
          amount: r.amount,
          tax: r.tax,
          net: r.amount - r.tax,
        })),
        expensesList: allExps.map(e => ({
          category: e.category,
          description: ('description' in e ? e.description : '') || '-',
          amount: e.amount,
        })),
      };
    });
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const data = buildReportData();
      if (data.length === 0) { toast.error('Nenhum dado no período selecionado.'); setExporting(null); return; }

      const wb = XLSX.utils.book_new();

      // Summary sheet with totals row
      const summaryRows: any[] = [
        ['Mês', 'Saldo Inicial', 'Faturamento (Bruto)', 'Impostos', 'Líquido', 'Despesas', 'Saldo Final'],
        ...data.map(d => [d.monthLabel, d.initialBalance, d.totalRevenue, d.totalTax, d.netRevenue, d.totalExpenses, d.netBalance]),
        // Totals row
        [
          'TOTAL PERÍODO',
          data.reduce((a, d) => a + d.initialBalance, 0),
          data.reduce((a, d) => a + d.totalRevenue, 0),
          data.reduce((a, d) => a + d.totalTax, 0),
          data.reduce((a, d) => a + d.netRevenue, 0),
          data.reduce((a, d) => a + d.totalExpenses, 0),
          data.reduce((a, d) => a + d.netBalance, 0),
        ],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws1['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumo Mensal');

      // Revenues sheet with totals
      const revRows: any[] = [['Mês', 'Cliente', 'Valor Bruto', 'Imposto', 'Valor Líquido']];
      data.forEach(d => d.revenues.forEach(r => revRows.push([d.monthLabel, r.client, r.amount, r.tax, r.net])));
      revRows.push([
        'TOTAL',
        '',
        data.flatMap(d => d.revenues).reduce((a, r) => a + r.amount, 0),
        data.flatMap(d => d.revenues).reduce((a, r) => a + r.tax, 0),
        data.flatMap(d => d.revenues).reduce((a, r) => a + r.net, 0),
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet(revRows);
      ws2['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Receitas');

      // Expenses sheet with totals
      const expRows: any[] = [['Mês', 'Categoria', 'Descrição', 'Valor']];
      data.forEach(d => d.expensesList.forEach(e => expRows.push([d.monthLabel, e.category, e.description, e.amount])));
      expRows.push(['TOTAL', '', '', data.flatMap(d => d.expensesList).reduce((a, e) => a + e.amount, 0)]);
      const ws3 = XLSX.utils.aoa_to_sheet(expRows);
      ws3['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Despesas');

      XLSX.writeFile(wb, `relatorio-${selectedYear}-${startMonth}-a-${endMonth}.xlsx`);
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar Excel.');
      console.error(e);
    }
    setExporting(null);
  };

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      const data = buildReportData();
      if (data.length === 0) { toast.error('Nenhum dado no período selecionado.'); setExporting(null); return; }

      const doc = new jsPDF({ orientation: 'landscape' });
      const period = `${MONTHS_PT.find(m => m.value === startMonth)?.label} a ${MONTHS_PT.find(m => m.value === endMonth)?.label} de ${selectedYear}`;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Financeiro', 14, 16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${period}`, 14, 23);

      // --- Página 1: Resumo ---
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Mensal', 14, 33);

      const summaryTotals = [
        fmt(data.reduce((a, d) => a + d.initialBalance, 0)),
        fmt(data.reduce((a, d) => a + d.totalRevenue, 0)),
        fmt(data.reduce((a, d) => a + d.totalTax, 0)),
        fmt(data.reduce((a, d) => a + d.netRevenue, 0)),
        fmt(data.reduce((a, d) => a + d.totalExpenses, 0)),
        fmt(data.reduce((a, d) => a + d.netBalance, 0)),
      ];

      autoTable(doc, {
        startY: 37,
        head: [['Mês', 'Saldo Inicial', 'Faturamento', 'Impostos', 'Líquido', 'Despesas', 'Saldo Final']],
        body: [
          ...data.map(d => [d.monthLabel, fmt(d.initialBalance), fmt(d.totalRevenue), fmt(d.totalTax), fmt(d.netRevenue), fmt(d.totalExpenses), fmt(d.netBalance)]),
        ],
        foot: [['TOTAL PERÍODO', ...summaryTotals]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      // --- Página 2: Receitas ---
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Receitas por Cliente', 14, 20);

      const allRevs = data.flatMap(d => d.revenues);
      const revTotals = [
        '',
        fmt(allRevs.reduce((a, r) => a + r.amount, 0)),
        fmt(allRevs.reduce((a, r) => a + r.tax, 0)),
        fmt(allRevs.reduce((a, r) => a + r.net, 0)),
      ];

      autoTable(doc, {
        startY: 24,
        head: [['Mês', 'Cliente', 'Valor Bruto', 'Imposto', 'Valor Líquido']],
        body: data.flatMap(d =>
          d.revenues.map(r => [d.monthLabel, r.client, fmt(r.amount), fmt(r.tax), fmt(r.net)])
        ),
        foot: [['TOTAL', ...revTotals]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' },
        footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });

      // --- Página 3: Despesas ---
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Despesas por Mês', 14, 20);

      const allExps = data.flatMap(d => d.expensesList);
      const expTotal = fmt(allExps.reduce((a, e) => a + e.amount, 0));

      autoTable(doc, {
        startY: 24,
        head: [['Mês', 'Categoria', 'Descrição', 'Valor']],
        body: data.flatMap(d =>
          d.expensesList.map(e => [d.monthLabel, e.category, e.description, fmt(e.amount)])
        ),
        foot: [['TOTAL', '', '', expTotal]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
        footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
      });

      doc.save(`relatorio-${selectedYear}-${startMonth}-a-${endMonth}.pdf`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar PDF.');
      console.error(e);
    }
    setExporting(null);
  };

  return (
    <div className="space-y-8 max-w-5xl">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-border">
        <div className="md:col-span-1">
          <h4 className="text-sm font-semibold">Período do Relatório</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione o ano e o intervalo de meses para o relatório.
          </p>
          <p className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-muted/40 border border-border">
            📄 O relatório inclui:<br />
            Resumo mensal · Receitas por cliente · Despesas por categoria · <strong>Totalizadores em todas as seções</strong>
          </p>
        </div>
        <div className="md:col-span-2 space-y-4">
          {/* Ano */}
          <div className="space-y-2">
            <Label>Ano</Label>
            <select
              className="w-[120px] h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Mês inicial e final */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Mês Inicial</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
              >
                {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Mês Final</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
              >
                {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Período selecionado: <strong>{MONTHS_PT.find(m => m.value === startMonth)?.label} a {MONTHS_PT.find(m => m.value === endMonth)?.label} de {selectedYear}</strong>
          </p>
        </div>
      </div>

      {/* Botões de exportação */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <Card className="hover:border-emerald-500/50 transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Exportar Excel</p>
              <p className="text-xs text-muted-foreground mt-0.5">3 abas + totalizadores</p>
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={exporting === 'excel'}
              onClick={exportExcel}
            >
              {exporting === 'excel' ? 'Exportando...' : 'Baixar Excel'}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500/50 transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Exportar PDF</p>
              <p className="text-xs text-muted-foreground mt-0.5">3 páginas + totalizadores</p>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={exporting === 'pdf'}
              onClick={exportPdf}
            >
              {exporting === 'pdf' ? 'Exportando...' : 'Baixar PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
