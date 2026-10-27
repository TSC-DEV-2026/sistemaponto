# Log — inputs do login

**Data:** 2026-10-27  
**Sessão:** refinamento visual dos campos de entrada

---

## ✅ O que foi feito

- CPF e senha ficaram com borda fina cinza `#D9DEE5`, fundo branco e sem glow no repouso
- O foco pinta só o campo selecionado: borda `#1E8A3A` e anel de 3 px em `rgb(124 207 18 / 0.12)`
- Ícones de 18 px, traço 1.75, cor `#94A3B8`
- Erro usa borda `#EF5350` e anel vermelho só no foco

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/LoginPage.tsx` — estilos locais dos dois campos

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Os estilos ficaram na página de login. `Input` e `PasswordField` continuam iguais para as outras telas
- O amarelo do autofill é adiado com transição longa de `background-color`, para o anel de foco continuar usando `box-shadow`

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
