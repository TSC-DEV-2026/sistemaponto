# Log — header global

**Data:** 2026-10-27  
**Sessão:** cabeçalho das páginas autenticadas

---

## ✅ O que foi feito

- O cabeçalho passou a ser único, no topo da área ao lado da sidebar
- O título e o subtítulo mudam conforme a rota
- O sino abre Notificações. O perfil abre Configurações, Senha e Sair
- Os títulos principais repetidos saíram das páginas. O nome da ficha e do acesso continuam no conteúdo

## 📁 Arquivos criados

- `frontend/src/components/layouts/AppHeader.tsx` — cabeçalho, sino e menu da conta
- `frontend/src/page-headings.ts` — título e subtítulo de cada rota

## ✏️ Arquivos modificados

- `frontend/src/components/layouts/AppShell.tsx` — o cabeçalho entrou acima do conteúdo, sem mudar a sidebar
- `frontend/src/pages/HomePage.tsx` — o cabeçalho local do dashboard saiu
- `frontend/src/pages/workforce/EntityScreens.tsx` — título das abas e dos formulários de catálogo
- `frontend/src/pages/workforce/OperationsPages.tsx` — títulos de ponto, ocorrências, solicitações, fechamento, notificações e relatórios
- `frontend/src/pages/workforce/JourneyPage.tsx` — títulos de ajuste e de lançamento
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — título da página
- `frontend/src/pages/workforce/RequestFormPage.tsx` — título da página
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — título da página
- `frontend/src/pages/workforce/EmployeePage.tsx` — o nome da pessoa ficou como título de conteúdo
- `frontend/src/pages/MembershipsPage.tsx` — título da página
- `frontend/src/pages/MembershipFormPage.tsx` — título da página
- `frontend/src/pages/MembershipDetailPage.tsx` — o nome do acesso ficou como título de conteúdo
- `frontend/src/pages/SettingsPage.tsx` — título da página
- `frontend/src/pages/ChangePasswordPage.tsx` — título da página
- `frontend/src/pages/TenantsPage.tsx` — título da página
- `frontend/src/pages/TenantDetailPage.tsx` — título da página

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A sidebar não foi reestilizada. Senha e Sair continuam nela e também no menu do perfil
- O sino leva à página de notificações que já existia. Não há contagem de não lidas na API, então não foi colocado um número
- A tela de escolher empresa fica antes do layout com sidebar e não recebe este cabeçalho

## 🐛 Problemas encontrados e soluções

- O navegador isolado caiu na tela de entrar, sem sessão → a conferência visual das páginas logadas ficou para a sessão já aberta

## 📌 Pendências / próximos passos

- Indicador de notificações não lidas, quando a API passar a informar essa quantidade
