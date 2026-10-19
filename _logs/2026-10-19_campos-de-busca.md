# Log — campos de busca no Swagger

**Data:** 2026-10-19  
**Sessão:** retorno do ponto 16, só o backend

---

## ✅ O que foi feito

- Cada GET de coleção mostra no Swagger os campos de busca que a rota já aceita
- O GET por id continua sem esses campos
- A regra de cada campo permanece a mesma: trecho no nome e igualdade nos demais

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/api/routes/workforce.py` — campos de busca declarados nas listagens
- `backend/tests/test_openapi.py` — o Swagger de cada coleção declara os filtros

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Só entram os filtros que a lista já usava
- Painel, apuração, relatórios e consultas pontuais ficam como estavam

## 🐛 Problemas encontrados

- —

## 📌 Pendências

- Reiniciar a API nesta branch para o `/docs` mostrar os campos
