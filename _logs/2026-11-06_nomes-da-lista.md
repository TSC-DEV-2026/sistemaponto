# Log — nomes da lista de acessos

**Data:** 2026-11-06  
**Sessão:** nomes da lista de acessos numa consulta

---

## ✅ O que foi feito

- A lista de Permissões e Acessos pede os nomes numa chamada ao autenticador.
- A ordem da página continua a do banco local. Nome ausente sai vazio.
- O detalhe, o vínculo novo e a troca de papel continuam na consulta de uma pessoa.
- O contrato da lista segue `id`, `person_id`, `full_name` e `role`.

## 📁 Arquivos criados

- `_logs/2026-11-06_nomes-da-lista.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `backend/app/services/authenticator_client.py` — consulta de nomes.
- `backend/app/services/membership_service.py` — lista preenche o nome numa chamada.
- `backend/tests/fakes.py` — resposta da consulta.
- `backend/tests/test_membership_service.py` — ordem da página e nome ausente.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O site não ganhou campo nem chamada. Quem não existe continua como Não informado.

## 🧪 Como testar

1. Subir o autenticador com a rota `POST /internal/people/lookup` e o Ponto.
2. Entrar como administrador e abrir Permissões e Acessos. Os nomes aparecem como antes.
3. No terminal do autenticador, a abertura da lista gera um `POST /api/v1/internal/people/lookup`.
4. Abrir um acesso e trocar o papel. Esse passo continua com `GET /api/v1/internal/people/{id}`.

## ❗ Problemas encontrados

- —
