# Log — relatório fora do funcionário

**Data:** 2026-11-03  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- O menu deixa de mostrar Relatórios para o funcionário. Administrador e gestor continuam vendo a aba.
- Abrir `/reports` com papel de funcionário volta para o dashboard. A API já recusava a consulta.

## 📁 Arquivos criados

- Nenhum.

## ✏️ Arquivos modificados

- `frontend/src/navigation.ts` — a aba Relatórios fica só para administrador e gestor.
- `frontend/src/components/layouts/AppShell.tsx` — o menu respeita essa regra.
- `frontend/src/pages/workforce/OperationsPages.tsx` — a rota redireciona o funcionário.

## 🗑️ Arquivos removidos

- Nenhum.

## 🔗 Dependências adicionadas

- Nenhuma.

## ⚠️ Decisões tomadas

- O bloqueio da tela segue a regra já existente na API: só administrador e gestor consultam relatório gerencial.

## 🐛 Problemas encontrados e soluções

- A tela explicava a regra e ainda deixava o funcionário na rota. O menu e a rota passam a impedir a entrada.

## 📌 Pendências / próximos passos

- Nenhum.
