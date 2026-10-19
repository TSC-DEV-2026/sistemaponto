# Log — campos de busca aceitos na listagem

**Data:** 2026-10-19  
**Sessão:** retorno do ponto 16, só o backend

---

## ✅ O que foi feito

- A listagem deixa de responder 500 quando o Swagger envia o campo de busca, mesmo vazio
- Cada coleção que mostra um filtro no Swagger também aceita esse campo na função da rota
- O valor continua sendo lido da query e aplicado na lista

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/api/routes/workforce.py` — a rota recebe o campo declarado no Swagger
- `backend/tests/test_openapi.py` — cada listagem aceita os próprios campos de busca

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O campo entra na assinatura que o Swagger lê e a função descarta o argumento depois de a query já ter sido lida
- Detalhe por id continua sem esses campos

## 🐛 Problemas encontrados

- `GET /cost-centers` quebrava com `unexpected keyword argument 'name'` porque o campo existia no Swagger e não na função

## 📌 Pendências

- Reiniciar a API nesta branch
