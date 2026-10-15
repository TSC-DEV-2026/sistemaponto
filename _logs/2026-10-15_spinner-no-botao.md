# Log — spinner no botão

**Data:** 2026-10-15  
**Sessão:** ponto 13 do plano, com a regra nova, site e aplicativo

---

## ✅ O que foi feito

- O botão que executa uma ação fica bloqueado até a ação terminar
- Durante a espera, o texto do botão é trocado por um spinner
- Vale para entrar e para os outros envios, no site e no aplicativo
- A barra de progresso que já existia permanece

## 📁 Arquivos criados

- `frontend/src/components/ui/action-form.tsx` — segura o envio do formulário e avisa o botão
- `mobile/lib/shared/widgets/busy_button.dart` — botão que troca o texto pelo spinner
- `mobile/test/busy_button_test.dart` — o segundo toque não dispara a ação de novo

## ✏️ Arquivos modificados

- `frontend/src/components/ui/button.tsx` — bloqueia o botão e troca o texto pelo spinner
- `frontend/src/pages/LoginPage.tsx` — entrar
- `frontend/src/pages/RegisterPage.tsx` — criar conta
- `frontend/src/pages/ForgotPasswordPage.tsx` — enviar o e-mail
- `frontend/src/pages/ResetPasswordPage.tsx` — definir senha
- `frontend/src/pages/ChangePasswordPage.tsx` — trocar senha
- `frontend/src/pages/VerifyEmailPage.tsx` — reenviar
- `frontend/src/pages/SettingsPage.tsx` — reenviar
- `frontend/src/pages/SelectTenantPage.tsx` — escolher empresa
- `frontend/src/pages/TenantsPage.tsx` — criar empresa
- `frontend/src/pages/TenantDetailPage.tsx` — salvar e excluir
- `frontend/src/pages/MembershipFormPage.tsx` — vincular
- `frontend/src/pages/MembershipDetailPage.tsx` — salvar e excluir
- `frontend/src/pages/PlanPage.tsx` — contratar, alterar e pagar
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — salvar funcionário
- `frontend/src/pages/workforce/EmployeePage.tsx` — salvar, vigência e ocorrência
- `frontend/src/pages/workforce/OperationsPages.tsx` — marcações, solicitações, período, avisos, relatórios e arquivos
- `frontend/src/components/layouts/AppShell.tsx` — sair
- `frontend/src/components/workforce/CatalogPanel.tsx` — salvar e excluir cadastro
- `frontend/src/components/workforce/PunchDay.tsx` — corrigir o dia
- `frontend/src/components/workforce/HourBankPanel.tsx` — lançar
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — apurar
- `mobile/lib/features/auth/presentation/screens/login_screen.dart` — entrar
- `mobile/lib/features/auth/presentation/screens/register_screen.dart` — criar conta
- `mobile/lib/features/auth/presentation/screens/forgot_password_screen.dart` — enviar
- `mobile/lib/features/auth/presentation/screens/reset_password_screen.dart` — definir senha
- `mobile/lib/features/app/presentation/screens/change_password_screen.dart` — trocar senha
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — marcar ponto
- `mobile/lib/features/app/presentation/screens/requests_screen.dart` — enviar e cancelar solicitação
- `mobile/lib/features/app/presentation/screens/notices_screen.dart` — marcar aviso como lido
- `mobile/lib/features/app/presentation/screens/account_screen.dart` — sair

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Só o botão acionado espera. Trocar de aba, mostrar a senha e marcar um aviso na caixa de seleção não entram
- A barra de progresso antiga não foi trocada. A regra nova fala do botão, não de um indicador no centro da tela

## 🐛 Problemas encontrados e soluções

- O typecheck acusou o import de input no login, que não era mais usado → o import foi removido
- O Flutter não está instalado nesta máquina, então o teste do botão do aplicativo não rodou aqui. O teste do backend passou

## 📌 Pendências / próximos passos

- —
