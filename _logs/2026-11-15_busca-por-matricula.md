# Log — busca por matrícula

**Data:** 2026-11-15  
**Sessão:** passo 2 da busca de funcionários

---

## ✅ O que foi feito

- A pesquisa de funcionário passou a achar por nome, CPF ou matrícula.
- Um texto com número procura nos dois: CPF e matrícula. Um texto com letra procura no nome e na matrícula.
- A lista em Quadro mostra a matrícula junto do CPF. A mesma pesquisa vale na operação em massa e na escolha de funcionário.

## 📁 Arquivos criados

- `_logs/2026-11-15_busca-por-matricula.md` — este log

## ✏️ Arquivos modificados

- `backend/app/repositories/workforce_repository.py` — a consulta combina nome, CPF e matrícula
- `backend/app/services/workforce_service.py` — a lista aceita o texto da pesquisa
- `backend/app/api/routes/workforce.py` — o filtro `q` entra na listagem
- `backend/tests/test_workforce_service.py` — cobre matrícula, nome e CPF no mesmo campo
- `frontend/src/pages/workforce/EntityScreens.tsx` — a busca e a linha do funcionário
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — a pesquisa da operação em massa
- `frontend/src/components/workforce/employee-combobox.tsx` — a escolha de funcionário
- `frontend/src/components/ui/site-select.tsx` — a lista remota de funcionários

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O filtro antigo de CPF completo continua exigindo os onze dígitos. A pesquisa livre é que aceita um trecho numérico.
- A matrícula com letra entra na mesma pesquisa do nome.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Os passos seguintes (exclusão de ausência, valor atual nas abas, avisos, filtros de relatório e vários gestores) ainda não foram feitos.
