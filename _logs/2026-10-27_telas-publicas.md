# Log — telas públicas no padrão do login

**Data:** 2026-10-27  
**Sessão:** mesmo visual do login nas telas públicas

---

## ✅ O que foi feito

- Criar conta, esqueci a senha, definir senha e verificar e-mail passaram a usar o mesmo card, campos, botão e rodapé do login
- O card de criar conta ficou na metade esquerda; as outras telas continuam com o card na metade direita
- A lógica de cadastro, envio, token e reenvio permaneceu a mesma

## 📁 Arquivos criados

- `frontend/src/components/auth-screen.tsx` — moldura compartilhada, com o lado do card configurável

## ✏️ Arquivos modificados

- `frontend/src/pages/LoginPage.tsx` — passou a usar a moldura compartilhada, sem mudar campos, foco, botão nem links
- `frontend/src/pages/RegisterPage.tsx` — card na metade esquerda
- `frontend/src/pages/ForgotPasswordPage.tsx` — card na metade direita
- `frontend/src/pages/ResetPasswordPage.tsx` — card na metade direita
- `frontend/src/pages/VerifyEmailPage.tsx` — card na metade direita

## 🗑️ Arquivos removidos

- `frontend/src/components/PublicFrame.tsx` — as telas públicas deixaram de usar o card antigo centralizado

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Só o cadastro usa o lado esquerdo, para uma transição futura entre as duas metades
- O painel cinza continua vazio
- As cores de foco do login (`#53bb7e` e `#56ad7b`) foram preservadas

## 🐛 Problemas encontrados e soluções

- O tipo do ícone estava importado de `react` → passou a vir de `lucide-react`

## 📌 Pendências / próximos passos

- A transição entre o card da direita (entrar) e o da esquerda (criar conta) ainda não foi animada
