# Log — pessoas do fechamento

**Data:** 2026-11-15  
**Sessão:** escolher quem entra no fechamento e lançar o banco numa só operação

---

## ✅ O que foi feito

- O novo fechamento ganhou os filtros de empresa, setor, equipe, função, jornada e sindicato, no mesmo formato dos relatórios.
- A lista mostra quem combina com o período e os filtros. Dá para marcar ou tirar cada pessoa. Só as marcadas entram no fechamento e têm os dias bloqueados.
- O banco do fechamento deixou de repetir um formulário por pessoa. A pessoa é escolhida uma vez, e crédito, débito e quitação ficam nesse mesmo bloco.
- O lançamento de crédito e débito pede as horas no formato 00:00, também no banco comum. O terceiro dígito só aparece a partir de 100 horas.
- O motivo de cancelar ou reabrir só é pedido no diálogo, depois do clique.

## 📁 Arquivos criados

- `backend/alembic/versions/0020_closing_members.py` — pessoas de cada fechamento
- `_logs/2026-11-15_pessoas-do-fechamento.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — vínculo da pessoa com o fechamento
- `backend/app/repositories/workforce_repository.py` — consulta de quem está fechado
- `backend/app/schemas/workforce.py` — pessoas enviadas ao criar
- `backend/app/services/workforce_service.py` — seleção, bloqueio e resultado
- `backend/app/api/routes/workforce.py` — lista de candidatos
- `backend/tests/test_workforce_service.py` — fechamento de uma pessoa só
- `frontend/src/pages/workforce/ClosingFormPage.tsx` — filtros e a marcação
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — uma operação de banco
- `frontend/src/pages/workforce/OperationsPages.tsx` — motivo só no diálogo
- `frontend/src/services/workforce.service.ts` — candidatos
- `frontend/src/page-headings.ts` — título da tela
- `frontend/src/utils/labels.ts` — horas no formato 00:00
- `frontend/src/components/workforce/HourBankPanel.tsx` — lançamento em horas

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Sem filtro, a lista traz todos. A vigência considerada é um dia dentro do período.
- Um fechamento antigo, sem pessoas gravadas, continua valendo para todo mundo.
- Duas pessoas diferentes podem ter fechamentos no mesmo intervalo. A mesma pessoa não.

## 🐛 Problemas encontrados e soluções

- A tela logada não foi percorrida nesta sessão. O site já estava no ar e a migração `0020_closing_members` foi aplicada.

## 📌 Pendências / próximos passos

- Conferir no site a marcação das pessoas e a operação única do banco.
