# Log — nomes das funcionalidades

**Data:** 2026-11-16  
**Sessão:** um nome em inglês para cada funcionalidade

---

## ✅ O que foi feito

- Cada recurso passou a usar o mesmo nome na tabela, na API e no endereço do site.
- O texto que a pessoa vê continua em português.
- Grupos, convenções, solicitações e avisos deixaram os nomes antigos.
- A ficha de cada cadastro saiu do prefixo do menu e foi para o nome do recurso.
- Fiscal / Folha ficou em `/integrations`. Estrutura ficou em `/structure`.
- As abas de Ocorrências ficaram no plural, como as de Motivos: `allowances`, `certificates`, `absences`, `leaves` e `vacations`.
- O endereço antigo abre a mesma tela.

## 📁 Arquivos criados

- `backend/alembic/versions/0021_resource_names.py` — renomeia as tabelas
- `backend/alembic/versions/0022_occurrence_kinds.py` — grava o tipo da ocorrência no plural
- `_logs/2026-11-16_nomes-das-funcionalidades.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — tabelas e colunas
- `backend/app/api/routes/workforce.py` — caminhos da API
- `backend/app/services/workforce_service.py` — grupos, avisos e apuração
- `backend/app/schemas/workforce.py` — campos de resposta
- `frontend/src/App.tsx` — endereços do site
- `frontend/src/route-slugs.ts` — endereço antigo
- `frontend/src/navigation.ts` — menu
- `frontend/src/pages/workforce/` — telas e abas
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — apuração
- `mobile/lib/features/app/presentation/screens/notices_screen.dart` — avisos

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O menu que reúne várias funcionalidades guarda o nome da tela: `/staff`, `/timekeeping`, `/structure`, `/labor-rules`, `/integrations` e `/plan`.
- Motivos e solicitações continuam no singular no banco. Só a ocorrência gravada usa o plural. Um envio antigo no singular é gravado no plural.
- A ficha usa o nome do recurso: `/employees`, `/jobs`, `/journeys`, `/groups`, `/units`, `/calculations`, `/punches`, `/notices`.
- A tabela `cost_centers` permanece. O centro de custo na tela é um grupo.
- A classe da solicitação continua `TimeRequest`, porque `Request` já é o pedido HTTP. A tabela e a rota são `requests`.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
