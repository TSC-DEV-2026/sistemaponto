# Log — máscara de CPF

**Data:** 2026-10-15  
**Sessão:** ponto 11 do plano, site e aplicativo

---

## ✅ O que foi feito

- Todo campo de CPF mostra `000.000.000-00` enquanto a pessoa digita
- O campo aceita só número. Letra, espaço e símbolo não entram. O que passa de 11 dígitos é ignorado
- O valor enviado à API continua só com os 11 dígitos

## 📁 Arquivos criados

- `mobile/lib/core/utils/cpf_formatter.dart` — aplica a máscara no campo do aplicativo

## ✏️ Arquivos modificados

- `frontend/src/utils/digits.ts` — máscara progressiva do CPF
- `frontend/src/pages/LoginPage.tsx` — CPF do entrar
- `frontend/src/pages/RegisterPage.tsx` — CPF do criar conta
- `frontend/src/pages/MembershipFormPage.tsx` — CPF do vínculo
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — CPF do funcionário novo
- `frontend/src/pages/workforce/EmployeePage.tsx` — CPF do cadastro, inclusive o valor já gravado
- `mobile/lib/core/utils/digits.dart` — máscara progressiva do CPF
- `mobile/lib/features/auth/presentation/screens/login_screen.dart` — CPF do entrar
- `mobile/lib/features/auth/presentation/screens/register_screen.dart` — CPF do criar conta
- `mobile/test/digits_test.dart` — máscara parcial, completa e excedente

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A máscara entra no campo. A API continua recebendo só os dígitos, como já acontecia
- CPF de funcionário já gravado aparece mascarado ao abrir a ficha

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- O ponto 12, o botão de ver a senha, fica em outro commit
