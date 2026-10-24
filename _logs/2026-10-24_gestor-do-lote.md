# Log — gestor do lote

**Data:** 2026-10-24  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- Nos combos de gestor da operação em massa, o filtro e o novo valor passaram a listar só funcionários que são administrador ou gestor.

## 📁 Arquivos criados

- `_logs/2026-10-24_gestor-do-lote.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/BulkChangesPage.tsx` — o combo cruza a ficha com o papel de administrador ou gestor

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quem não tem ficha de funcionário continua fora do combo, porque o vínculo de gestor aponta para um funcionário.

## 🐛 Problemas encontrados e soluções

- O combo carregava todos os funcionários. → A lista ficou restrita aos papéis administrador e gestor.

## 📌 Pendências / próximos passos

- —
