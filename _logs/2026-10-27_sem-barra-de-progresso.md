# Log — barra de progresso descontinuada

**Data:** 2026-10-27  
**Sessão:** remoção da barra do topo

---

## ✅ O que foi feito

- A barra de progresso do topo foi removida
- O contador que ligava a barra em cada página e em cada chamada da API também saiu

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — a barra e o gatilho de rota saíram do layout
- `frontend/src/services/api.ts` — a API não liga mais a barra
- `frontend/src/services/auth.service.ts` — o login não precisa mais pedir para pular a barra
- `frontend/src/types/axios.d.ts` — a opção `skipLoader` saiu

## 🗑️ Arquivos removidos

- `frontend/src/components/GlobalLoader.tsx` — a barra
- `frontend/src/components/RouteLoader.tsx` — o acionamento ao trocar de página
- `frontend/src/store/loader.store.ts` — o estado que só servia à barra

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O spinner do botão, como o de Entrar, permanece. Só a barra do topo foi descontinuada

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
