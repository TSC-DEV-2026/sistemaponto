# Log — visual de plano e assinatura

**Data:** 2026-11-06  
**Sessão:** redesign de Plano e Assinatura e restrição ao administrador

---

## ✅ O que foi feito

- Assinaturas, cobranças e contratação passaram ao card, à cápsula e à ficha das outras telas.
- O primeiro carregamento fica num spinner só, dentro de um card. As três seções aparecem juntas.
- O menu, o cartão do início e a rota `/plan` ficam só com o administrador. Gestor e membro voltam para o início.

## 📁 Arquivos criados

- `_logs/2026-11-06_plano-e-assinatura.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/PlanPage.tsx` — visual e bloqueio da rota.
- `frontend/src/navigation.ts` — item só para o administrador.
- `frontend/src/pages/HomePage.tsx` — cartão do plano só para o administrador.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A regra de preço, capacidade e pagamento continua na API. A tela não repete a faixa explicativa.
- Os filtros são listas fixas e não disparam consulta própria.

## 🧪 Como testar

1. Entrar como administrador e abrir Plano e Assinatura.
2. Conferir o plano em vigor, filtrar assinaturas e cobranças e pagar uma cobrança em aberto.
3. Na aba Contratação, alterar capacidade ou pagamento e salvar.
4. Entrar como gestor ou membro e conferir que o menu e o cartão do início não mostram o plano. Abrir `/plan` volta para o início.

## ❗ Problemas encontrados

- O navegador isolado não entra no sistema local. A conferência visual logada ficou com quem usa a tela.
