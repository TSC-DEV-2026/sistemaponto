# Log — registro de ponto por tipo

**Data:** 2026-10-29  
**Sessão:** mostrar só o tipo de registro da ficha

---

## ✅ O que foi feito

- A tela Registro de Ponto passou a mostrar a faixa explicativa e um único card, conforme o `clock_method` do funcionário ligado ao acesso.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — apresentação da tela de registro

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- `simple` mostra o botão Registrar já existente. `qr` e `face` só informam que o registro é no aplicativo.
- O título e o subtítulo continuam no header global.

## 🐛 Problemas encontrados e soluções

- O frontend não tem runner de testes. A checagem foi `tsc --noEmit`, com sucesso.

## 📌 Pendências / próximos passos

- Conferir no navegador com funcionários de cada tipo.
