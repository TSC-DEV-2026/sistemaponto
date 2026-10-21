# Log — minha conta

**Data:** 2026-10-21  
**Sessão:** ponto 21 do plano, só o backend

---

## ✅ O que foi feito

- `GET /api/v1/auth/me` devolve nome, e-mail e CPF da pessoa logada
- `PUT /api/v1/auth/me` salva nome e e-mail no autenticador
- O CPF não entra nessa gravação
- `DELETE /api/v1/auth/me` remove o acesso desta pessoa nesta empresa
- A única administradora não sai, e a resposta é "A empresa precisa de um administrador."
- Notificações e a lista de vínculos permanecem as rotas que já existiam

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/api/routes/auth.py` — leitura, edição e saída da conta
- `backend/app/schemas/auth.py` — CPF na sessão e corpo com nome e e-mail
- `backend/app/services/auth_service.py` — atualização e saída da empresa
- `backend/app/services/authenticator_client.py` — CPF e atualização no autenticador
- `backend/app/services/membership_service.py` — a mesma frase da administradora única
- `backend/tests/fakes.py` — nome e e-mail no autenticador falso
- `backend/tests/test_auth_service.py` — conta, CPF e administradora única

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Nome, e-mail e CPF continuam no autenticador. Este banco guarda só o vínculo
- A confirmação de excluir fica na tela
- A seção Notificações e a lista de permissões não ganharam rota nova

## 🐛 Problemas encontrados

- —

## 📌 Pendências

- O autenticador precisa estar com o `PUT /internal/people/{id}` e o CPF no estado da pessoa
