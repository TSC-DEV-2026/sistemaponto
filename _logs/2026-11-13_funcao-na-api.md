# Log — função na API

**Data:** 2026-11-13  
**Sessão:** ajuste de feature

---

## ✅ O que foi feito

- Empresa nova nasce com o registro Função Padrão.
- A auditoria de vínculo passa a gravar Alteração de função.
- A descrição do lote na API fala em função.

## 📁 Arquivos criados

- `_logs/2026-11-13_funcao-na-api.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/company_defaults.py` — nome do registro padrão
- `backend/app/core/workforce.py` — texto da auditoria
- `backend/app/api/routes/workforce.py` — descrição do lote
- `backend/tests/test_workforce_service.py` — conferência da auditoria
- `backend/tests/test_openapi.py` — nome do teste da lista

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A tabela `jobs`, a rota `/jobs`, o filtro `job_id` e o tipo `job` permanecem. Esse nome não aparece na tela.
- Quem já tem o registro Cargo Padrão continua com esse nome. Só empresa nova recebe Função Padrão.
- Auditorias já gravadas como Alteração de cargo não são reescritas.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- O site troca os textos de cargo para função em outro pull request.
