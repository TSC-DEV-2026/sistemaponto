# Log — aviso de ação

**Data:** 2026-11-09  
**Sessão:** aviso de sucesso, atenção e erro nas ações do site

---

## ✅ O que foi feito

- O site passou a mostrar um aviso no canto inferior direito quando uma ação termina.
- Sucesso fica verde, atenção fica amarelo e erro fica vermelho.
- Entrar, sair, salvar, editar, excluir e trocar a senha disparam o aviso.
- A consulta de listas continua mostrando o erro na própria tela.

## 📁 Arquivos criados

- `frontend/src/components/ui/toaster.tsx` — cartão do aviso.
- `frontend/src/store/toast.store.ts` — fila dos avisos.
- `_logs/2026-11-09_aviso-de-acao.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — o aviso fica disponível em todas as telas.
- `frontend/src/services/api.ts` — sucesso e erro das ações abrem o aviso.
- `frontend/src/styles/globals.css` — entrada e saída do aviso.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Nenhuma biblioteca nova. O aviso usa o que o site já tem.
- O backend não mudou.
- A sessão expirada aparece em amarelo depois que a página volta para o login.

## 🧪 Como testar

1. Entrar no site e sair. O aviso verde "Sessão encerrada." aparece embaixo, à direita.
2. Entrar com a senha errada. O aviso vermelho mostra o erro.
3. Salvar ou excluir um registro. O aviso verde confirma a ação, e o X fecha o cartão.
