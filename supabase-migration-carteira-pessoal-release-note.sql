-- ============================================================
-- Novidade: Carteira Pessoal (PF)
-- Inserir via Supabase Dashboard > SQL Editor
-- ============================================================
INSERT INTO release_notes (id, title, module_name, summary, content, created_at)
VALUES (
  gen_random_uuid(),
  'Carteira Pessoal',
  'carteira_pessoal',
  'Novo módulo de gestão financeira pessoal integrado à PJ. Acompanhe saldo, provisões, caixinhas e patrimônio.',
  '## 💰 Carteira Pessoal

Seu novo módulo de gestão financeira pessoal chegou!

### O que é novo

- **Receitas automáticas** — Pro-labore e Retirada de PL são espelhados automaticamente da PJ como receitas pessoais
- **Provisões** — Planeje gastos recorrentes com start/end por mês e número de parcelas calculado automaticamente
- **Caixinhas de Reserva** — Organize sua poupança em objetivos separados (viagem, emergência, investimento...)
- **Distribuição de PL** — Configure regras percentuais ou de valor fixo para distribuir o PL entre suas caixinhas automaticamente
- **Gráfico de Evolução** — Acompanhe seu patrimônio mês a mês com projeção de 6 meses
- **Descrição em destaque** — Adicione notas opcionais às provisões; elas aparecem em verde abaixo do nome

### Como ativar

Acesse **Definições → Carteira Pessoal** e ative o módulo. Após ativar, o menu lateral mostrará o acesso direto.',
  now()
);
