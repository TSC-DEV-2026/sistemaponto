# Log — banco e folhas

**Data:** 2026-11-17  
**Sessão:** lançamento do banco igual ao fechamento, quitação de todos e folha de ponto

---

## ✅ O que foi feito

- O novo lançamento em Ponto > Banco de horas passou a ter Somar, Diminuir, Lançar saldo e Quitar o saldo, com o mesmo efeito do fechamento.
- A lista do banco ganhou editar e excluir. Lançamento de fechamento continua sendo alterado pelo fechamento. Período fechado continua bloqueado.
- O fechamento ganhou Quitar o banco de todos, para quem usa banco de horas naquele fechamento.
- A folha impressa ganhou faixa, identificação, linhas alternadas, falta destacada, total, assinaturas e número da página.

## 📁 Arquivos criados

- `_logs/2026-11-17_banco-e-folhas.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — quatro tipos no lançamento avulso, edição, exclusão e quitação de todos
- `backend/app/schemas/workforce.py` — tipos do lançamento e observação da quitação em lote
- `backend/app/api/routes/workforce.py` — atualização do lançamento e rota de quitação de todos
- `backend/tests/test_workforce_service.py` — quitação, saldo, edição e lote
- `frontend/src/pages/workforce/JourneyPage.tsx` — formulário e ações da lista
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — quitar o banco de todos
- `frontend/src/components/workforce/HourBankPanel.tsx` — filtro e valor exibido
- `frontend/src/utils/labels.ts` — ordem dos tipos e valor do lançamento
- `frontend/src/utils/report-pdf.ts` — desenho da folha
- `frontend/src/services/workforce.service.ts` — quitação de todos e vínculo com o fechamento
- `frontend/src/App.tsx` — rota de edição do lançamento
- `frontend/src/page-headings.ts` — título da edição

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quitar o saldo no lançamento avulso zera o saldo da data escolhida. No fechamento, a data continua sendo o fim do período.
- Editar ou excluir um lançamento feito pelo fechamento fica na tela do fechamento.
- Quitar o banco de todos substitui o lançamento que cada pessoa já tinha naquele fechamento. Quem está com saldo zero e sem lançamento é pulado.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A tela logada não foi percorrida neste ambiente.
