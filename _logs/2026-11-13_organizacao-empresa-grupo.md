# Log — organização, empresa e grupo

**Data:** 2026-11-13  
**Sessão:** ajuste de feature

---

## ✅ O que foi feito

- O que era Empresa passou a se chamar Organização na API, no site e nos dois aplicativos.
- O que era Unidade passou a se chamar Empresa. Organização nova nasce com Empresa Padrão.
- O que era Classificação passou a se chamar Grupo. A aba fica em `?aba=grupos`.
- Organização usa o ícone de camadas. Empresa continua com o prédio. Motivos usa uma nota, e Grupo fica com a etiqueta.

## 📁 Arquivos criados

- `_logs/2026-11-13_organizacao-empresa-grupo.md` — este log

## ✏️ Arquivos modificados

- `backend/app/api/dependencies/auth.py` — texto para escolher a organização
- `backend/app/api/routes/auth.py` — textos de sessão e troca de organização
- `backend/app/api/routes/clock_devices.py` — textos do aparelho por organização
- `backend/app/api/routes/memberships.py` — textos do vínculo na organização
- `backend/app/api/routes/tenants.py` — textos do cadastro de organização
- `backend/app/api/routes/workforce.py` — textos de empresa, grupo e lote
- `backend/app/core/workforce.py` — auditoria de empresa e de grupo
- `backend/app/services/auth_service.py` — aviso do administrador da organização
- `backend/app/services/clock_device_service.py` — reconhecimento em mais de uma organização
- `backend/app/services/company_defaults.py` — Empresa Padrão no lugar de Unidade Padrão
- `backend/app/services/membership_service.py` — aviso do administrador da organização
- `backend/app/services/seed_service.py` — log da organização inicial
- `backend/app/services/workforce_service.py` — mensagens de organização, empresa e grupo
- `backend/tests/test_auth_service.py` — conferência das frases novas
- `backend/tests/test_clock_device_service.py` — conferência do aparelho
- `backend/tests/test_tenant_service.py` — nome do teste da organização
- `backend/tests/test_workforce_service.py` — conferência das frases novas
- `frontend/src/App.tsx` — aba de grupos nos atalhos antigos
- `frontend/src/components/layouts/TenantSwitcher.tsx` — rótulo e ícone da organização
- `frontend/src/components/workforce/ClassificationFilter.tsx` — texto ao carregar os grupos
- `frontend/src/navigation.ts` — rótulos de organização, empresa, grupo e o ícone de motivos
- `frontend/src/page-headings.ts` — títulos de organização
- `frontend/src/pages/RegisterPage.tsx` — campo Organização
- `frontend/src/pages/SelectTenantPage.tsx` — escolha da organização
- `frontend/src/pages/SettingsPage.tsx` — atalho Organizações
- `frontend/src/pages/TenantDetailPage.tsx` — ficha da organização
- `frontend/src/pages/TenantFormPage.tsx` — nova organização
- `frontend/src/pages/TenantsPage.tsx` — lista de organizações
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — grupo e empresa na operação em massa
- `frontend/src/pages/workforce/ClockDevicesPage.tsx` — aparelhos da organização
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — empresa e grupo na ficha
- `frontend/src/pages/workforce/EmployeePage.tsx` — empresa e grupo na visualização
- `frontend/src/pages/workforce/EntityScreens.tsx` — telas de empresa e de grupo
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas e textos do relatório
- `frontend/src/pages/workforce/PeoplePage.tsx` — aba Grupos
- `frontend/src/pages/workforce/catalogs.ts` — rótulos de empresa e de grupo
- `frontend/src/utils/labels.ts` — rótulos do histórico
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — rótulo Empresa
- `mobile/lib/features/app/presentation/screens/select_tenant_screen.dart` — escolha da organização
- `mobile/lib/features/auth/presentation/screens/register_screen.dart` — campo Organização
- `mobile2/lib/features/device/data/face_decision.dart` — reconhecimento entre organizações
- `mobile2/lib/features/device/presentation/screens/home_screen.dart` — textos da organização
- `mobile2/lib/features/device/presentation/screens/setup_screen.dart` — adicionar organização
- `mobile2/test/face_decision_test.dart` — frase do reconhecimento

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Tabelas, rotas e tipos continuam `tenants`, `units` e `classifications`. O JWT usa `tenant_id`.
- O autenticador não muda. Ele não guarda empresa, unidade nem classificação.
- Centro de custo continua com esse nome. É um grupo, não a palavra Grupo.
- Nomes já gravados no banco não entram neste commit. O ajuste deles é um update à parte.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Rodar o update dos nomes padrão que já existem no banco, quando for a hora.
