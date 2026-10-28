# Log — interação dos cards do dashboard

**Data:** 2026-10-27  
**Sessão:** hover e clique dos cards

---

## ✅ O que foi feito

- Cada card do dashboard sobe 4 px no hover, com sombra e borda na cor do próprio tema
- A seta desliza 4 px para a direita. O círculo dela não se move
- O card inteiro é um único link. Não há link dentro de link
- O teclado usa a mesma borda colorida. Movimento reduzido desliga a animação

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/HomePage.tsx` — o card passou a ser o link, com a cor de hover de cada tema
- `frontend/src/styles/globals.css` — transição, hover, foco, toque e movimento reduzido só desses cards

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- As rotas continuam as da sidebar: Pessoas, Jornada e Ponto, Solicitações, Fechamento e Plano
- O hover de elevação só vale para mouse. No toque fica o pressionamento, para o card não permanecer levantado
- O texto “Revisar”, “Abrir fechamentos” e “Ver plano” continua visível, agora dentro do mesmo link

## 🐛 Problemas encontrados e soluções

- O navegador isolado não tinha sessão → a conferência visual ficou para a sessão já aberta

## 📌 Pendências / próximos passos

- —
