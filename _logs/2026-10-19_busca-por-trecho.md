# Log — busca por trecho do nome

**Data:** 2026-10-19  
**Sessão:** retorno do ponto 16, só o backend

---

## ✅ O que foi feito

- O campo `name` do cargo encontra o cadastro quando o nome contém o texto, sem diferenciar maiúsculas
- O nome do funcionário segue a mesma regra no campo `full_name`
- CPF, identificadores e os demais filtros continuam por igualdade
- `%` e `_` digitados na pesquisa entram como texto, não como curinga

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/repositories/workforce_repository.py` — nome e nome do funcionário por trecho
- `backend/app/api/routes/workforce.py` — descrição do campo `name` no Swagger
- `backend/tests/test_workforce_service.py` — trecho do nome, página de 20 e CPF inteiro

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A pesquisa do nome deixa de ser só igualdade porque o retorno pediu valor condicionado
- O CPF permanece o número inteiro de 11 dígitos

## 🐛 Problemas encontrados

- —

## 📌 Pendências

- Reiniciar a API nesta branch para o `/docs` mostrar a descrição nova
