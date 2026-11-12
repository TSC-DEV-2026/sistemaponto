# Log — tela da apuração

**Data:** 2026-11-12  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Jornada e Ponto ficou com Jornadas, Apuração e Banco de horas. Marcações saiu dessa tela.
- Relatórios mostra a consulta Marcações, com o horário e se a batida vale ou deixou de valer. O relatório Ponto continua o histórico da apuração.
- A apuração lista cada dia do período. O dia sem jornada prevista mostra "Sem jornada prevista".
- Com banco de horas, a tela mostra o saldo do período e o saldo acumulado em cada dia. Ver detalhes abre na mesma tela e alterna o saldo só daquele dia.
- Administrador e gestor corrigem as marcações, lançam falta e lançam atestado ou abono no dia. Férias e afastamento ficam só em Ausências.
- Depois de gravar, a apuração do período roda de novo.
- Período fechado ou solicitação pendente deixa as ações visíveis e desativadas. Ver detalhes continua. O mesmo bloqueio vale na ficha e no lançamento de ausência.
- Ajustes e Ocorrências passou a se chamar Ausências, com Falta, Atestado, Férias, Abono e Afastamento.

## 📁 Arquivos criados

- `frontend/src/components/workforce/ApuracaoDialog.tsx` — detalhe do dia, correção, falta e atestado ou abono
- `frontend/src/components/workforce/use-day-lock.ts` — período fechado e solicitação pendente

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/TimeResultsPanel.tsx` — dias, saldo e ações
- `frontend/src/components/workforce/apuracao-day.tsx` — linha do dia com saldo e ver detalhes
- `frontend/src/components/workforce/PunchDay.tsx` — correção presa ao dia e bloqueio
- `frontend/src/pages/workforce/JourneyPage.tsx` — sai a aba Marcações
- `frontend/src/pages/workforce/OccurrencePages.tsx` — seção Ausências e bloqueio do lançamento
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — correção do gestor e ausência na ficha
- `frontend/src/pages/workforce/OperationsPages.tsx` — linha do relatório Marcações
- `frontend/src/navigation.ts` — menu de Jornada, Ausências e Relatórios
- `frontend/src/page-headings.ts` — títulos de Ausências
- `frontend/src/services/workforce.service.ts` — saldo do período e do dia
- `frontend/src/utils/labels.ts` — tipos de ausência

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Ver detalhes abre um diálogo na apuração, sem ir para outra rota.
- O saldo do período e o saldo da linha usam `balance_minutes`. O saldo só do dia usa `bank_minutes`.
- Férias e afastamento não entram nos botões do dia.
- Ajuste de ponto e lançamento de marcação saem do menu. Os rótulos antigos permanecem para o histórico.

## 🐛 Problemas encontrados e soluções

- O navegador isolado parou na tela de login, então o fluxo não foi clicado com um usuário. A tipagem do frontend passou.

## 📌 Pendências / próximos passos

- Conferir na tela, com login, a apuração, o bloqueio e o relatório Marcações.
