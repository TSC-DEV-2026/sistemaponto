# Log — estrutura sem setor

**Data:** 2026-11-17  
**Sessão:** equipe ligada na empresa e grupos na estrutura

---

## ✅ O que foi feito

- Setor saiu do sistema. A equipe pertence a uma empresa, e a empresa pode ter várias equipes.
- Atribuir equipe grava a empresa junto. A troca da empresa da equipe não reescreve quem já está nela.
- Grupos passou a usar o ícone que era do setor.
- O histórico de grupo de cada funcionário foi apagado e os contadores das tabelas de grupo voltaram ao início.
- Cada organização ganhou o grupo Setores, com o valor Setor padrão, sem vínculo com funcionário.
- A aba Grupos saiu do Quadro e foi para a Estrutura Organizacional, na ordem Empresas, Equipes e Grupos.
- Organização nova deixa de criar setor e centro de custo padrão. O cadastro inicial cria Setores e Setor padrão.

## 📁 Arquivos criados

- `backend/alembic/versions/0023_team_company.py` — vínculo da equipe, remoção de setores e grupo Setores
- `backend/alembic/versions/0024_categories.py` — tabelas e coluna de categoria
- `frontend/src/components/workforce/organization-filters.tsx` — filtros compartilhados
- `_logs/2026-11-17_estrutura-sem-setor.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — equipe com empresa
- `backend/app/models/__init__.py` — setor fora do pacote
- `backend/app/schemas/workforce.py` — equipe e funcionário sem setor
- `backend/app/core/workforce.py` — vigência sem setor
- `backend/app/core/resource_catalog.py` — coleção de setores removida
- `backend/app/api/routes/workforce.py` — rotas e filtros sem setor
- `backend/app/services/workforce_service.py` — vínculo, nome único e exclusão
- `backend/app/services/company_defaults.py` — padrão Setores e equipe na empresa
- `backend/app/repositories/workforce_repository.py` — vigência de categoria
- `backend/tests/test_workforce_service.py` — equipe na empresa
- `backend/tests/test_openapi.py` — filtro da equipe
- `backend/tests/test_resource_catalog.py` — coleção sem setores
- `frontend/src/App.tsx` — endereços antigos de setor e de grupo
- `frontend/src/navigation.ts` — Quadro e Estrutura
- `frontend/src/route-slugs.ts` — apelidos antigos
- `frontend/src/page-headings.ts` — títulos de grupo e equipe
- `frontend/src/utils/concept-icons.ts` — ícone da categoria
- `frontend/src/utils/labels.ts` — texto de categoria
- `frontend/src/services/workforce.service.ts` — funcionário sem setor
- `frontend/src/pages/workforce/PeoplePage.tsx` — Quadro sem grupos
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas e filtro de relatório
- `frontend/src/pages/workforce/EntityScreens.tsx` — equipe na empresa e volta do grupo
- `frontend/src/pages/workforce/catalogs.ts` — cadastro da equipe
- `frontend/src/pages/workforce/EmployeePage.tsx` — ficha sem setor
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — aba de categorias
- `frontend/src/components/workforce/ClassificationFilter.tsx` — filtro de categorias
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — massa sem setor
- `frontend/src/pages/workforce/ClosingFormPage.tsx` — fechamento sem setor

## ✅ Filtros de empresa e equipe

- Operações em massa, relatórios e novo fechamento ficaram com os mesmos filtros: empresa, equipe, função, jornada e situação.
- O arranjo é o mesmo nos três: empresa, equipe e função na primeira linha; jornada e situação na segunda.
- Marcar uma empresa marca as equipes dela. Desmarcar a empresa tira essas equipes. Dá para desmarcar equipe por equipe depois.

## ✅ Categorias

- Grupo passou a se chamar Categoria na tela, na API e no banco.
- As rotas ficaram `/categories` e `/category-values`. O endereço antigo `/groups` abre a rota nova.
- As tabelas ficaram `categories` e `category_values`. A coluna ficou `category_id`.
- O ícone continua o mesmo.

## ⚠️ Pendências

Nenhuma.

## 📝 Observações

A migração já foi aplicada neste ambiente. O histórico antigo de grupo e de setor não volta no downgrade. O vínculo do grupo Setores com os funcionários fica para lançamento manual.
