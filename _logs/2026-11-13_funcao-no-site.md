# Log — função no site

**Data:** 2026-11-13  
**Sessão:** ajuste de feature

---

## ✅ O que foi feito

- Pessoas, ficha, histórico, navegação e operação em massa passam a dizer função.
- A aba fica em `?aba=funcoes`. Nova, editar e a lista vazia usam o feminino.

## 📁 Arquivos criados

- `_logs/2026-11-13_funcao-no-site.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/PeoplePage.tsx` — aba Funções
- `frontend/src/pages/workforce/catalogs.ts` — rótulos e volta da lista
- `frontend/src/pages/workforce/EntityScreens.tsx` — textos da tela da função
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — aba e troca na ficha
- `frontend/src/pages/workforce/EmployeePage.tsx` — campo na aba Trabalho
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — operação e filtro
- `frontend/src/utils/labels.ts` — rótulo do vínculo no histórico
- `frontend/src/navigation.ts` — textos de Pessoas e da operação em massa

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A rota `/people/jobs` e o tipo `job` permanecem. Só o texto visível muda.
- Os aplicativos não citam cargo, então não entram nesta troca.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A API, com Função Padrão e a auditoria, está em outro pull request.
