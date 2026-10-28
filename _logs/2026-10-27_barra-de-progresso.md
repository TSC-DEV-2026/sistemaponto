# Log — barra de progresso

**Data:** 2026-10-27  
**Sessão:** cor e avanço da barra do topo

---

## ✅ O que foi feito

- A barra do topo ficou verde e mais alta, para aparecer sobre o fundo claro
- Enquanto algo carrega, ela avança até perto do fim e só completa quando a espera acaba

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/components/GlobalLoader.tsx` — cor, trilha e avanço contínuo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A cor é o verde do botão de entrar, com uma faixa clara atrás
- Cada resposta que termina empurra a barra. O tempo também empurra, para ela não ficar parada no meio
- O login continua sem essa barra. O botão segue com o próprio spinner

## 🐛 Problemas encontrados e soluções

- A barra era um terço fixo, azul-marinho, só pulsando → passou a crescer em largura até 100%

## 📌 Pendências / próximos passos

- —
