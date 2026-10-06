# Log — setup inicial

**Data:** 2026-10-06  
**Sessão:** setup inicial

---

## ✅ O que foi feito

- API, site e app do sistemaponto, no molde do sistema `base` e no contrato do autenticador
- Empresa, vínculo e sessão local. Senha continua só no autenticador
- Trial da empresa: 7 dias e capacidade de 10 funcionários, gravado na criação da empresa
- Site de gestão com a sidebar dos domínios já definidos
- App do funcionário: entrar, cadastrar, senha, troca de empresa, consulta própria. Sem gestão
- Banco `sistemaponto` criado e migration aplicada
- Empresa inicial criada na subida, ligada à pessoa admin que já existia no autenticador
- Testes da API (27) e do app (2) passando

## 📁 Arquivos criados

- `backend/` — API FastAPI, Alembic, testes e `.env` local (não versionado)
- `frontend/` — site Vite em `http://localhost:5175`, proxy `/api` para a porta 8003
- `mobile/` — app Flutter do funcionário
- `README.md`
- `.gitignore`
- `backend/app/core/trial.py` — prazo e capacidade do trial
- `frontend/src/navigation.ts` — sidebar por domínio
- `frontend/src/pages/DomainPage.tsx` — domínios ainda sem cadastro
- `frontend/src/pages/HomePage.tsx` — dashboard operacional
- `frontend/src/pages/PlanPage.tsx` — trial e capacidade
- `frontend/src/pages/SettingsPage.tsx` — verificação, empresas e senha
- `frontend/src/utils/trial.ts`

## ✏️ Arquivos modificados

- `backend/app/models/tenant.py` — início, fim e capacidade do trial
- `backend/app/schemas/tenant.py` — os mesmos campos no `TenantOut`
- `backend/app/services/tenant_service.py` — toda empresa nova abre o trial
- `backend/app/repositories/tenant_repository.py` — grava o trial
- `backend/alembic/versions/0001_create_tenants.py` — colunas do trial
- `backend/app/api/serialization.py`, `backend/app/api/transport.py`, `backend/app/api/routes/auth.py` — datas em JSON
- `backend/app/core/config.py`, `backend/.env.example`, `backend/tests/conftest.py` — porta 8003 e site 5175
- `backend/main.py` — nome sistemaponto
- `frontend/src/App.tsx`, `frontend/src/components/layouts/AppShell.tsx` — shell de gestão
- `frontend/src/types/api.ts` — campos do trial
- `frontend/src/pages/MembershipsPage.tsx` — acessos, separado de funcionários
- `C:\Dev2\auther\backend\.env.example` e o `.env` local do autenticador — `http://localhost:5175` na allowlist de redirect

## 🗑️ Arquivos removidos

- `mobile/README.md` — texto padrão do Flutter, substituído pelo README da raiz
- `mobile/.gitkeep` — a pasta deixou de ser só um marcador

## 🔗 Dependências adicionadas

- API: as mesmas do `base` (FastAPI, SQLAlchemy, psycopg, Alembic, Pydantic, python-jose, slowapi, httpx, boto3, pytest)
- Site: as mesmas do `base` (React, Vite, TypeScript, Tailwind, Axios, Zustand, Lucide)
- App: Flutter, Riverpod, go_router, Dio, flutter_secure_storage, flutter_dotenv, Lucide, freezed, json_serializable

## ⚠️ Decisões tomadas

- O nome de pasta e de produto nesta geração é sistemaponto. O nome comercial definitivo continua em aberto nos documentos de instrução
- API na porta 8003 e site na 5175, para não colidir com o autenticador (8001/5173) nem com o `base` (8002/5174)
- Trial de 7 dias, até 10 funcionários e funcionalidades liberadas, como está definido no produto. Fim do trial, preço, cobrança e upgrade não foram implementados
- A sidebar segue os domínios aprovados. Histórico não virou item de menu
- Pessoas (funcionário, cargo, centro de custo) ficou separada de Permissões e Acessos (vínculo de login)
- Empresas ficam em Configurações, com o seletor de empresa no shell
- O app não recebeu gestão, aprovação, fechamento nem plano
- Registro simples, apuração, banco de horas, aprovações e fechamento não ganharam regra inventada
- O projeto `clockup` não está neste workspace, então o registro de ponto não foi copiado de lá
- Os playbooks em `promptmds` não foram alterados: o prazo do trial é regra deste produto, não do gerador genérico

## 🐛 Problemas encontrados e soluções

- O autenticador não estava no ar. Foi iniciado na porta 8001 para o seed conseguir achar a pessoa admin
- Não há ferramenta de browser nesta sessão. O site público respondeu em `http://localhost:5175/` e o OpenAPI expõe o trial. O formulário de login não foi percorrido na tela

## 📌 Pendências / próximos passos

- Regras ainda abertas no pacote de instruções: comportamento do registro simples, apuração, banco de horas, fim do trial, preço e cobrança
