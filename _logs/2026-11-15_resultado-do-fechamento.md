# Log — resultado do fechamento

**Data:** 2026-11-15  
**Sessão:** banco de horas e resultado depois de fechar o período

---

## ✅ O que foi feito

- O período fechado continua sem aceitar marcação, ajuste, ocorrência, vigência e banco comum. Ver os totais segue liberado. Cancelar ou reabrir devolve a edição.
- Depois de fechar, a tela do fechamento mostra o banco de quem usa banco: crédito, débito e quitação do saldo. Essas operações saem se o fechamento for cancelado ou reaberto.
- A mesma tela lista as pessoas do período. A impressão baixa uma folha por pessoa, em retrato, para assinatura: nome, CPF, matrícula, nome da empresa, os dias com os pontos e os totais. No fim ficam os campos do empregador e do funcionário.
- Um fechamento já concluído abre de novo pelo botão Ver resultado, para consultar e baixar outra vez.

## 📁 Arquivos criados

- `backend/alembic/versions/0019_closing_bank.py` — coluna do fechamento no lançamento de banco
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — banco, grade e impressão
- `_logs/2026-11-15_resultado-do-fechamento.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — vínculo do lançamento com o fechamento
- `backend/app/repositories/workforce_repository.py` — remove os lançamentos do fechamento
- `backend/app/schemas/workforce.py` — operação, pessoas e bancos
- `backend/app/services/workforce_service.py` — lançamento no fechamento e o resultado
- `backend/app/api/routes/workforce.py` — ação de banco no fechamento
- `backend/tests/test_workforce_service.py` — quitação, crédito e cancelamento
- `frontend/src/App.tsx` — rota do resultado
- `frontend/src/page-headings.ts` — título da tela
- `frontend/src/pages/workforce/ClosingFormPage.tsx` — abre o resultado ao fechar
- `frontend/src/pages/workforce/OperationsPages.tsx` — botão para ver de novo
- `frontend/src/services/workforce.service.ts` — tipos e o lançamento
- `frontend/src/utils/report-pdf.ts` — PDF do fechamento

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A quitação continua fora do banco comum. Ela só existe com o período fechado.
- O lançamento do fechamento fica datado no último dia do período, ou em hoje se o período ainda não terminou.
- Cancelar e reabrir apagam esses lançamentos. O banco anterior permanece.
- A impressão do fechamento é a folha que a pessoa assina, uma página por funcionário. A empresa entra pelo nome da vigência. Quem não usa banco não leva a coluna de banco.

## 🐛 Problemas encontrados e soluções

- A tela logada não foi conferida. O site não estava no ar nesta sessão.

## 📌 Pendências / próximos passos

- Rodar a migração `0019_closing_bank` antes de usar a tela.
- Conferir no site, com um período fechado, a quitação, o crédito, o débito, a grade e o PDF.
