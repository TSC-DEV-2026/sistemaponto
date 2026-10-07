# Log — marcações que valem

**Data:** 2026-10-07  
**Sessão:** ponto 1 do plano, só o backend

---

## ✅ O que foi feito

- O ajuste passa a guardar as marcações do dia e, enquanto pendente, não altera o ponto
- Aprovar troca as marcações válidas daquele dia: as novas valem e as antigas permanecem com `valid` falso
- A correção manual do administrador segue a mesma troca, com origem `manual`
- O gestor continua decidindo a própria equipe e não a própria solicitação; o administrador decide em qualquer equipe

## 📁 Arquivos criados

- `backend/alembic/versions/0003_punch_day.py` — validade da marcação e horários do ajuste; o banco já estava nessa revisão

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — `valid`, `voided_at` e horários da solicitação
- `backend/app/models/__init__.py` — registro do modelo novo
- `backend/app/schemas/workforce.py` — lista de marcações do ajuste e correção do dia
- `backend/app/repositories/workforce_repository.py` — contagem só do que ainda vale
- `backend/app/services/workforce_service.py` — troca do dia na aprovação e na correção manual
- `backend/app/api/routes/workforce.py` — `POST /punches/corrections` e filtro `valid`
- `backend/app/core/workforce.py` — origem `manual`
- `backend/tests/test_workforce_service.py` — dia inteiro, histórico, gestor e período fechado

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A origem da solicitação aprovada permanece `approved_request`; a correção do administrador usa `manual`
- Um `occurred_at` sozinho continua valendo como o dia com uma marcação
- A marcação isolada do botão e a do administrador continuam somando um horário, sem trocar o dia

## 🐛 Problemas encontrados e soluções

- O Alembic apontava para `0003_punch_day` sem o arquivo no repositório → o arquivo da revisão foi recriado; o banco já tinha as colunas

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site ainda não mostra a lista de marcações do ajuste nem o campo `valid`
