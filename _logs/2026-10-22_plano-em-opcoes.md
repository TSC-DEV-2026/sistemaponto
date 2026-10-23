# Log — plano e assinatura em opções

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Plano e Assinatura passou a ter as opções Assinaturas e Cobranças e Contratação.
- Assinaturas e Cobranças abre com o plano em vigor, ou com o trial quando ainda não há plano, e em seguida as listas de assinaturas e de cobranças.
- Registrar pagamento permanece na cobrança em aberto.
- Contratação traz o formulário de contratar, quando não há plano, e de alterar, quando há. Capacidade, pagamento e as regras atuais permanecem.
- Contratar, alterar e pagar continuam com o administrador.

## 📁 Arquivos criados

- `_logs/2026-10-22_plano-em-opcoes.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/PlanPage.tsx` — as duas opções no lugar da página única

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quem não é administrador continua vendo o trial da empresa e a frase de que contratar, alterar e pagar fica com o administrador. As listas seguem só para o administrador, porque a API já recusa a consulta para os demais.
- O pagamento não foi para o formulário de contratação. Ele continua na linha da cobrança em aberto.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A tela não foi clicada no navegador. A checagem foi o TypeScript.
