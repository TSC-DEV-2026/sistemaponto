# Log — ordem dos filtros

**Data:** 2026-11-15  
**Sessão:** ordem dos filtros no relatório, na massa e a aba Equipe

---

## ✅ O que foi feito

- O relatório ganhou função, jornada, sindicato e situação, na ordem empresa, setor, equipe, função, jornada, sindicato e situação.
- Empresa, setor, equipe, função, jornada e sindicato continuam aceitando um ou vários. Cada linha usa a vigência do dia dela. Os filtros se somam.
- A alteração em massa ficou só com esses sete filtros, um registro por vez, na mesma ordem. Gestor e grupos saíram da seleção.
- Na edição do funcionário, a aba Equipe ficou entre Dados e Função.

## 📁 Arquivos criados

- `_logs/2026-11-15_ordem-dos-filtros.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — função, jornada, sindicato e situação pela vigência do dia
- `backend/app/api/routes/workforce.py` — vários ids no relatório
- `backend/tests/test_workforce_service.py` — função e situação no meio do período
- `frontend/src/pages/workforce/OperationsPages.tsx` — filtros novos no relatório
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — ordem e a retirada de gestor e grupos
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — aba Equipe depois de Dados
- `cursor_instructions_ponto/02-WEB-ADMIN-SCOPE.md` — a ordem dos filtros

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A situação é uma escolha só: todas, ativo ou desligado.
- No relatório, funcionário e os grupos do relatório de pessoas permanecem.
- Na massa, cada filtro continua com um registro. A lista usa a vigência de hoje.

## 🐛 Problemas encontrados e soluções

- A tela não foi conferida logada. O navegador desta sessão não tem conta aberta.

## 📌 Pendências / próximos passos

- O mapeamento dos ícones do menu ainda não foi feito.
