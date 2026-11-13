# Log — classificação

**Data:** 2026-11-12  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A empresa passa a cadastrar classificações e os valores de cada uma. Centro de custo deixa de ser um cadastro fixo e vira a classificação Centro de custo.
- O funcionário fica com, no máximo, um valor vigente de cada classificação. Trocar um valor encerra só aquela classificação e pede a data. Período fechado continua bloqueando a data.
- Classificação ou valor que já está no histórico não é excluído. O nome antigo permanece na vigência.
- Empresa que já tinha centros de custo ganha a classificação e um valor para cada nome. As vigências passam a apontar para esses valores. Empresa nova nasce com Centro de custo e o valor Centro de custo Padrão.
- O filtro soma classificações diferentes e alterna valores da mesma classificação. A lista de funcionários usa o dia de hoje. O relatório de pessoas usa o dia pedido.
- A operação em massa grava o valor de uma classificação sem mexer nas outras. Se uma pessoa do lote falhar, nenhuma daquele lote é salva.
- O site troca Centros de custo por Classificações. A ficha, a lista, a massa e o relatório de pessoas usam a classificação.
- A Apuração em Jornada e Ponto não muda. O aplicativo não usa classificação.
- A alteração ficou em duas branches: a API em `feat/classifications` e o site em `feat/classifications-site`.

## 📁 Arquivos criados

- `backend/alembic/versions/0016_classifications.py` — tabelas, coluna da vigência e cópia dos centros de custo
- `frontend/src/components/workforce/ClassificationFilter.tsx` — filtro por valores, com a mesma combinação da API
- `_logs/2026-11-12_classificacao.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — classificação, valor e o vínculo na vigência
- `backend/app/models/__init__.py` — exporta os modelos novos
- `backend/app/core/workforce.py` — tipo de vigência e o nome Centro de custo
- `backend/app/core/reports.py` — relatório Pessoas
- `backend/app/core/resource_catalog.py` — recursos classifications e classification-values
- `backend/app/schemas/workforce.py` — entrada, saída e os valores vigentes do funcionário
- `backend/app/repositories/workforce_repository.py` — vigência aberta por classificação e a consulta do dia
- `backend/app/services/company_defaults.py` — empresa nova nasce com a classificação Centro de custo
- `backend/app/services/workforce_service.py` — cadastro, filtro, massa, relatório e a fachada de centros de custo
- `backend/app/api/routes/workforce.py` — rotas, filtros e o relatório de pessoas
- `backend/tests/test_openapi.py` — filtros das rotas novas
- `backend/tests/test_resource_catalog.py` — nomes no catálogo
- `backend/tests/test_workforce_service.py` — histórico, filtro, lote e relatório
- `frontend/src/services/workforce.service.ts` — valores vigentes, a classificação na vigência e os filtros do relatório
- `frontend/src/utils/labels.ts` — rótulo Classificação no histórico
- `frontend/src/pages/workforce/catalogs.ts` — cadastro de classificação no lugar do centro de custo
- `frontend/src/pages/workforce/PeoplePage.tsx` — aba Classificações
- `frontend/src/pages/workforce/EntityScreens.tsx` — valores dentro da classificação e filtro da lista
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — um campo por classificação na ficha
- `frontend/src/pages/workforce/EmployeePage.tsx` — valores vigentes e o nome no histórico
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — operação e filtro de classificação
- `frontend/src/pages/workforce/OperationsPages.tsx` — relatório de pessoas em um dia
- `frontend/src/App.tsx` — rotas de classificação e o endereço antigo de centro de custo
- `frontend/src/page-headings.ts` — título da classificação
- `frontend/src/navigation.ts` — menu de Pessoas e da operação em massa

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A API antiga de centros de custo continua respondendo, lendo e gravando os valores da classificação Centro de custo, até o site novo entrar. A tabela `cost_centers` permanece.
- O site novo vai em outra branch, nascida da main, para o diff não carregar a API.
- A API entra primeiro. Enquanto o site antigo estiver no ar, Centros de custo segue funcionando pela fachada.
- Endereço antigo de centro de custo abre Classificações. O id antigo não é o id do valor novo, então o detalhe volta para a lista.
- Mais de um valor da mesma classificação na mesma pessoa, valor livre na ficha e o aplicativo ficam de fora.

## 🐛 Problemas encontrados e soluções

- A tipagem do site passou. O fluxo na tela não foi clicado: a API de classificação está na outra branch, e rodar a migração no banco local reescreveria os centros de custo já gravados.

## 📌 Pendências / próximos passos

- Aceitar a PR da API antes da PR do site.
- Rodar a migração e conferir, com login, o cadastro, a ficha, o filtro, a massa e o relatório de pessoas.
