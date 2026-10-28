# Log — redesenho do dashboard

**Data:** 2026-10-27  
**Sessão:** visual do dashboard

---

## ✅ O que foi feito

- O dashboard passou a seguir a composição da referência: cabeçalho, cinco cards e o plano na largura inteira
- Os números, o trial, a assinatura e as rotas continuam os mesmos

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/HomePage.tsx` — layout, cores, ícones, sombras e ações dos cards

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A sidebar existente foi mantida. O sino abre Notificações e o nome abre Configurações, porque o layout principal não tinha esses controles
- A seta de Hoje abre Pessoas e a de Ponto abre Jornada e Ponto. As outras setas repetem os links que já existiam
- Enquanto o painel carrega, o card de plano não mostra zero no lugar de funcionários ativos

## 🐛 Problemas encontrados e soluções

- O navegador isolado abriu a tela de entrar, sem sessão → a conferência visual autenticada ficou para a sessão já aberta no sistema

## 📌 Pendências / próximos passos

- —
