# Log — férias por dia e CID opcional

**Data:** 2026-10-21  
**Sessão:** ponto 23 do plano, só o backend

---

## ✅ O que foi feito

- A API recusa férias enviadas com horário, na solicitação e na ocorrência
- Férias em dias inteiros continuam valendo
- No atestado, o CID pode ficar vazio
- CRM e nome do médico continuam obrigatórios
- A foto do atestado continua opcional

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — férias só por dia e CID opcional
- `backend/tests/test_workforce_service.py` — horário de férias e atestado sem CID

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Os rótulos De e Até ficam no site e no aplicativo
- Horário de férias é `starts_at`, `ends_at`, `occurred_at` ou marcações do dia

## 🐛 Problemas encontrados

- —

## 📌 Pendências

- —
