# Log — casca mobile e mobile2

**Data:** 2026-11-27  
**Sessão:** UX dos apps (marca, abas, datas, login)

---

## ✅ O que foi feito

- Faixa azul com wordmark no shell do mobile e do mobile2.
- TabBar no ponto no lugar dos botões; títulos de tela redundantes removidos.
- Últimos 5 registros na aba Registro; datas em pt-BR (Hoje/Ontem/dd/MM/yyyy).
- Login centralizado na vertical; label Entrar centralizado.
- Overflow do combo Tipo em Avisos corrigido.

## 📁 Arquivos criados

- `_logs/2026-11-27_casca-mobile-e-mobile2.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `mobile/lib/...` — home, login, shell, brand, format, avisos, solicitações, conta.
- `mobile2/lib/...` — device shell, home e setup.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Branch `feat/mobile-ux-shell`; não bump de versão neste PR.
- Wordmark do mobile2 permanece `sistemapontorep` com `rep` dourado.

## 🐛 Problemas encontrados e soluções

- Hot reload (`r`) não recarregava os últimos registros; carga sob demanda + hot restart (`R`).
