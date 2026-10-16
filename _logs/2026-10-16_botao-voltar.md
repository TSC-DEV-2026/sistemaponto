# Log — botão voltar

**Data:** 2026-10-16  
**Sessão:** ponto 15 do plano, site e aplicativo

---

## ✅ O que foi feito

- Telas que não são item da barra lateral ganharam o botão "Voltar" no topo, com ícone, antes do título
- Novo funcionário e a ficha do funcionário voltam para Pessoas, na aba Funcionários
- Nova solicitação volta para Solicitações
- Vincular pessoa e o detalhe do acesso voltam para Permissões e Acessos
- Empresas volta para Configurações. O detalhe da empresa volta para a lista de empresas
- Trocar senha volta para Configurações no site e para Conta no aplicativo

## 📁 Arquivos criados

- `frontend/src/components/ui/back-link.tsx` — botão Voltar do site
- `mobile/lib/shared/widgets/screen_back_button.dart` — botão Voltar do aplicativo

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — novo funcionário
- `frontend/src/pages/workforce/EmployeePage.tsx` — ficha do funcionário
- `frontend/src/pages/workforce/RequestFormPage.tsx` — nova solicitação
- `frontend/src/pages/MembershipFormPage.tsx` — vincular pessoa
- `frontend/src/pages/MembershipDetailPage.tsx` — detalhe do acesso
- `frontend/src/pages/TenantsPage.tsx` — empresas
- `frontend/src/pages/TenantDetailPage.tsx` — detalhe da empresa
- `frontend/src/pages/ChangePasswordPage.tsx` — trocar senha
- `mobile/lib/features/app/presentation/screens/new_request_screen.dart` — nova solicitação
- `mobile/lib/features/app/presentation/screens/change_password_screen.dart` — trocar senha

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Itens da barra lateral não receberam o botão
- A aba Funcionários é a aba inicial de Pessoas, então voltar para `/people` cai nela
- Os cadastros separados do ponto 16 ainda não existem. O mesmo botão fica pronto para essas telas

## 🐛 Problemas encontrados e soluções

- O Flutter não está instalado nesta máquina, então o aplicativo não foi executado aqui

## 📌 Pendências / próximos passos

- —
