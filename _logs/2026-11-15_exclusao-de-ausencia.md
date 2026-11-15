# Log — exclusão de ausência

**Data:** 2026-11-15  
**Sessão:** passo 3 da exclusão de ausência

---

## ✅ O que foi feito

- Cada ausência ganhou um ícone de lixeira para o gestor e para o administrador.
- Excluir tira o lançamento. A apuração do dia aberto é calculada de novo e a falta volta, quando for o caso.
- Período fechado recusa a exclusão e o lançamento permanece.

## 📁 Arquivos criados

- `_logs/2026-11-15_exclusao-de-ausencia.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — exclusão no período aberto e registro no histórico
- `backend/tests/test_workforce_service.py` — cobre a falta que volta e o período fechado
- `frontend/src/pages/workforce/OccurrencePages.tsx` — lixeira em cada lançamento
- `cursor_instructions_ponto/04-BUSINESS-RULES-AND-WORKFLOWS.md` — a regra da exclusão

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quem pode lançar o tipo também pode excluir. O funcionário não exclui.
- A solicitação que originou a ausência permanece. Sai só a ocorrência que entra na apuração.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Os passos seguintes (valor atual nas abas, avisos, filtros de relatório e vários gestores) ainda não foram feitos.
