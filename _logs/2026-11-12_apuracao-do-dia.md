# Log — apuração do dia

**Data:** 2026-11-12  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A apuração devolve cada dia do período. O dia sem jornada prevista leva o texto "Sem jornada prevista" e não vira falta.
- Com banco de horas, o saldo do período inclui os dias anteriores. Cada dia traz o saldo acumulado até aquela data, e o movimento do dia continua em separado.
- O gestor corrige as marcações do dia e lança falta na própria equipe. A origem da correção continua manual.
- O lançamento de marcação deixa de gravar ocorrência e deixa de criar batida. A correção do dia é o caminho. A solicitação de ajuste aprovada continua gravando as marcações.
- Pedido pendente que cobre o dia bloqueia a correção, a falta, o atestado e o abono, na apuração e na ficha. Recusado, aceito ou cancelado, a alteração volta.
- Relatórios ganha a consulta Marcações, com as batidas que valem e as que deixaram de valer. O relatório Ponto continua o histórico da apuração.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/core/time_result.py` — dia sem jornada prevista
- `backend/app/core/workforce.py` — falta entra no que o gestor lança
- `backend/app/core/reports.py` — consulta Marcações
- `backend/app/schemas/workforce.py` — saldo do período e saldo do dia
- `backend/app/repositories/workforce_repository.py` — marcações válidas e invalidadas
- `backend/app/services/workforce_service.py` — apuração, bloqueio, correção e relatório
- `backend/tests/test_workforce_service.py` — cobertura das regras novas

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O saldo acumulado usa a mesma conta do banco de horas, do início da admissão até a data da linha.
- O movimento de um dia continua em `bank_minutes`. O acumulado fica em `balance_minutes`.
- A consulta nova se chama `marking`, para o relatório `punch` permanecer Ponto.
- A tela não entrou nesta etapa.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Site: tirar Marcações de Jornada e Ponto, renomear Ausências e montar a apuração do dia.
- Commit e push ainda não foram pedidos.
