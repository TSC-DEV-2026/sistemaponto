# Log — fechamento do período

**Data:** 2026-10-08  
**Sessão:** ponto 5 do plano, só o backend

---

## ✅ O que foi feito

- O gestor ou o administrador escolhe o período, em geral o mês civil, e também um intervalo de datas, e fecha num passo
- O fechamento não ocorre quando há solicitação pendente, ponto incompleto ou conflito entre abono ou atestado e marcação
- O aviso de intervalo menor não impede o fechamento
- Cancelar exige motivo e deixa o período cancelado no histórico. Reabrir exige motivo e devolve o mesmo período a aberto
- Depois de reaberto ou cancelado, marcação, ajuste, ocorrência, vigência e banco voltam a ser lançados no período

## 📁 Arquivos criados

- `backend/alembic/versions/0006_period_closing.py` — datas do período e fim da unicidade do mês; a revisão foi aplicada no banco

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — início e fim do fechamento
- `backend/app/schemas/workforce.py` — período, cancelamento e reabertura
- `backend/app/repositories/workforce_repository.py` — período que cruza o dia, pendência e conflito
- `backend/app/services/workforce_service.py` — bloqueios do fechamento, cancelamento e reabertura
- `backend/tests/test_workforce_service.py` — pendência, ponto incompleto, conflito, intervalo, cancelamento e reabertura

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O mês civil continua valendo quando o pedido traz ano e mês. Com datas, o período é o intervalo informado
- Período cancelado não bloqueia. A correção volta a ser possível depois da reabertura
- Arquivo fiscal de período cancelado ou reaberto fica para o ponto 6

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site ainda não cancela nem reabre o período, e não envia um intervalo diferente do mês
