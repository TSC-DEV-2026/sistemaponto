# Log — abono, atestado, afastamento e férias

**Data:** 2026-10-08  
**Sessão:** ponto 2 do plano, só o backend

---

## ✅ O que foi feito

- O funcionário solicita abono, atestado, afastamento e férias; pendente, o ponto não muda
- O gestor da equipe e o administrador lançam os quatro manualmente, com origem `manual`
- A aprovação grava a ocorrência com origem `approved_request`
- O atestado pede CID, CRM e nome do médico; a foto é opcional
- O período aceita o dia inteiro, um horário no mesmo dia ou vários dias
- Se há marcação válida no período, o atestado entra e a ocorrência leva o aviso "período abonado conflita com registro de ponto"
- O documento fica na solicitação e na ocorrência, visível para quem já enxerga aquele funcionário: a própria pessoa, o gestor da equipe e o administrador

## 📁 Arquivos criados

- `backend/alembic/versions/0004_time_off.py` — período, dados do atestado e aviso; a revisão foi aplicada no banco

## ✏️ Arquivos modificados

- `backend/app/core/workforce.py` — tipos de solicitação e o texto do conflito
- `backend/app/models/workforce.py` — campos do período e do atestado
- `backend/app/schemas/workforce.py` — entrada e saída desses campos
- `backend/app/services/workforce_service.py` — pedido, lançamento manual, aviso e foto
- `backend/app/api/routes/workforce.py` — envio da foto do atestado
- `backend/tests/test_workforce_service.py` — pedido pendente, aprovação, conflito, gestor e período fechado

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A origem da solicitação aprovada permanece `approved_request`; o lançamento do gestor ou do administrador usa `manual`
- O efeito do abono sobre a falta fica para o ponto 3
- A foto sobe em `POST /api/v1/certificate-photos` e o pedido guarda a chave; a URL só aparece para quem já pode ver o registro

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site e o app ainda não pedem nem exibem afastamento, férias e os campos do atestado
