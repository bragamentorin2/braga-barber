# CHANGELOG

## [Unreleased] — 2026-10-04

### feat: Módulo Carteira Pessoal (PF) — implementação completa

Implementação do módulo de gestão financeira pessoal integrado à PJ.
Espelha automaticamente retiradas (Pró-labore e PL) da empresa como receitas pessoais
e permite controle de provisões, reservas (caixinhas), despesas e patrimônio pessoal.

---

#### Novos Arquivos

**Tipos**
- `src/types/personalWallet.ts` — contratos TypeScript completos

**Hook principal**
- `src/hooks/usePersonalWallet.ts` — hook central com CRUD completo,
  getMonthSummary(), getPersonalIncomes(), confirmPLReceipt(),
  suggestAllocation(), getHistoricalBalances()
  Proteção contra stale-closure, fresh-read de saldo, recalibração automática.

**Componentes Wallet**
- `src/components/wallet/PersonalExpensesPanel.tsx`
- `src/components/wallet/PersonalReservesPanel.tsx`
- `src/components/wallet/PLReceiptDialog.tsx`
- `src/components/wallet/PersonalEvolutionChart.tsx`

**Componentes UI**
- `src/components/ui/WalletMonthPicker.tsx` — seletor mês/ano (DropdownMenu Radix)
- `src/components/ui/DatePicker.tsx`
- `src/components/ui/progress.tsx`

**Finance**
- `src/components/finance/EditProlaboreMonthDialog.tsx`

**Configurações**
- `src/components/settings/PersonalWalletTab.tsx`

**Página**
- `src/pages/PersonalWallet.tsx`

**Banco de Dados**
- `supabase-migration-provision-description.sql` (aplicar manualmente no Supabase)

---

#### Inputs Inteligentes — Provisões com Prazo

Lógica bidirecional:
  Parcelas => Mês Final:  endMonth = addMonths(startMonth, n)
  Mês Final => Parcelas:  installments = monthDiff(startMonth, endMonth)
  Limpar (X):             endMonthId = '' + installments = ''

Ao editar provisão existente com prazo, Parcelas é recalculado automaticamente.

---

#### Bugs Corrigidos

- BUG-01: critério pl_receipt unificado (getPersonalIncomes vs getMonthSummary)
- BUG-02: ajuste pontual rejeita valor zero (v <= 0)
- BUG-03: description não duplica no label de despesas reais
- BUG-04: parcelas recalculadas ao abrir edição de provisão com prazo
- BUILD: 5 erros TypeScript corrigidos + PWA workbox size limit 3MB

---

#### Arquivos Modificados

App.tsx, Sidebar.tsx, Header.tsx, ProfileTab.tsx, Settings.tsx,
Financial.tsx, ExpenseProvisionsList.tsx, EditExpenseDialog.tsx,
AddClientDialog.tsx, EditClientDialog.tsx, ExpenseCategoriesTab.tsx,
FinanceContext.tsx, useSupabaseFinance.ts, vite.config.ts
