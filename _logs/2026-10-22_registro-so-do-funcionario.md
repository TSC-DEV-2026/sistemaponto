# Log — registro só do funcionário

**Data:** 2026-10-22  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- O bloco em que o administrador marcava o ponto de outra pessoa saiu de Registro de Ponto.
- `POST /punches` só aceita a marcação da pessoa logada. A origem continua `employee` e o tipo da ficha continua valendo.
- QR Code e reconhecimento facial continuam sendo a marcação da própria pessoa.
- O ajuste do dia, a solicitação aprovada e a importação do AFD permanecem, com as origens `manual`, `approved_request` e `afd`.

## 📁 Arquivos criados

- `_logs/2026-10-22_registro-so-do-funcionario.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — a marcação de outra pessoa deixa de entrar
- `backend/tests/test_workforce_service.py` — a recusa do administrador e as marcações de teste da própria pessoa
- `frontend/src/pages/workforce/OperationsPages.tsx` — sai o registro do administrador

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quem tem ficha simples continua com o botão Registrar, inclusive o administrador marcando o próprio ponto.
- O gestor e o administrador continuam ajustando pelo caminho que já existia. Esse caminho não marca o horário de agora no lugar da pessoa.

## 🐛 Problemas encontrados e soluções

- A primeira trava também recusou QR Code e reconhecimento facial. Esses dois voltaram a entrar quando a pessoa da sessão é a da ficha.

## 📌 Pendências / próximos passos

- A tela não foi clicada no navegador. A checagem foi o TypeScript e os testes da API.
