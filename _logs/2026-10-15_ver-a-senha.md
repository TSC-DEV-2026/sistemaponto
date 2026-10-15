# Log — ver a senha

**Data:** 2026-10-15  
**Sessão:** ponto 12 do plano, site e aplicativo

---

## ✅ O que foi feito

- Todo campo de senha nasce oculto e tem um botão de olho no próprio campo
- Oculto, o ícone é o olho. Visível, o ícone é o olho cortado
- Vale para senha, senha atual, senha nova e confirmação, nas telas de entrar, criar conta, definir senha e trocar senha

## 📁 Arquivos criados

- `frontend/src/components/ui/password-field.tsx` — campo de senha do site com o botão de olho
- `mobile/lib/shared/widgets/secret_field.dart` — campo de senha do aplicativo com o botão de olho

## ✏️ Arquivos modificados

- `frontend/src/pages/LoginPage.tsx` — senha do entrar
- `frontend/src/pages/RegisterPage.tsx` — senha do criar conta
- `frontend/src/pages/ResetPasswordPage.tsx` — senha nova e confirmação do definir senha
- `frontend/src/pages/ChangePasswordPage.tsx` — senha atual, senha nova e confirmação
- `mobile/lib/features/auth/presentation/screens/login_screen.dart` — senha do entrar
- `mobile/lib/features/auth/presentation/screens/register_screen.dart` — senha do criar conta
- `mobile/lib/features/auth/presentation/screens/reset_password_screen.dart` — senha nova e confirmação
- `mobile/lib/features/app/presentation/screens/change_password_screen.dart` — senha atual, senha nova e confirmação

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Cada campo guarda o próprio estado de visível ou oculto. Mostrar a senha nova não mostra a confirmação
- O botão é do tipo button, para não enviar o formulário

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
