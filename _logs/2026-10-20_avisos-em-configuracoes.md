# Log — avisos em configurações

**Data:** 2026-10-20  
**Sessão:** ponto 18 do plano, só o site

---

## ✅ O que foi feito

- O item Notificações saiu do grupo Gestão da barra lateral
- Em Configurações, Notificações é um botão no visual de Reenviar, com o ícone de sino, e abre a tela de notificações
- A tela continua com os interruptores, o texto, o padrão ligado, o envio diário e as listas
- Voltar nessa tela retorna para Configurações
- O aplicativo não tem essa barra lateral, então não foi alterado

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/navigation.ts` — remove o item Notificações da Gestão
- `frontend/src/pages/SettingsPage.tsx` — botão Notificações com o ícone de sino
- `frontend/src/pages/workforce/OperationsPages.tsx` — Voltar para Configurações

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- O documento de navegação ainda lista Notificações em Gestão. O ponto 18 do plano manda tirar o item, e a barra seguiu o plano
- O acesso ficou em Configurações e abre a tela, em vez de embutir o conteúdo na mesma página

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
