# Log — voltar para o topo

**Data:** 2026-10-29  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- O botão Voltar passa a levar a página para o topo.
- A volta do detalhe da apuração deixa de restaurar a rolagem antiga da lista.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/components/ui/back-link.tsx` — o clique em Voltar rola a janela para o topo
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — ao retornar do detalhe, a lista abre no topo e mantém o resultado da apuração

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A consulta apurada continua na tela. Só a posição da rolagem deixa de ser recuperada.

## 🐛 Problemas encontrados e soluções

- A volta do detalhe gravava a rolagem e reaplicava esse ponto na lista. → A volta agora usa o topo da página.

## 📌 Pendências / próximos passos

- Conferir no navegador, com a sessão do administrador, o Voltar do detalhe da apuração.
