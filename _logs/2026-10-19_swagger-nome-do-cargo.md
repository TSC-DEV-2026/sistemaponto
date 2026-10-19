# Log — Swagger do nome do cargo

**Data:** 2026-10-19  
**Sessão:** retorno do ponto 16, só o backend

---

## ✅ O que foi feito

- A lista de cargo no Swagger ganhou o campo `name`
- O valor continua sendo o nome inteiro do cargo, com a mesma capitalização

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/api/routes/workforce.py` — campo `name` na lista dos cadastros com nome
- `backend/tests/test_openapi.py` — o Swagger de `/api/v1/jobs` declara `name`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O campo aparece em todo cadastro que já filtrava por `name`, porque a lista é a mesma função
- Nome vazio não filtra

## 🐛 Problemas encontrados

- —

## 📌 Pendências

- Reiniciar a API nesta branch para o campo aparecer no `/docs`
