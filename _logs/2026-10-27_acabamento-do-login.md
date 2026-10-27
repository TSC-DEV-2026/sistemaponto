# Log — acabamento do login

**Data:** 2026-10-27  
**Sessão:** sombra e foco da tela de login

---

## ✅ O que foi feito

- Inputs em repouso ficaram com sombra cinza suave e borda `#D9DEE5`, sem glow
- O foco troca só o campo ativo para borda `#1E8A3A` e o glow verde da referência
- O anel escuro do componente compartilhado foi zerado nessa página
- O botão Entrar e o card ganharam as sombras da imagem

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/LoginPage.tsx` — sombras, foco, botão, card e fundo da coluna direita

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A borda e a sombra ficam no próprio input. O `ring` do `Input` compartilhado entra com largura zero só nesta tela, para não pintar o contorno escuro
- O erro continua com borda vermelha e um glow vermelho só no campo focado

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
