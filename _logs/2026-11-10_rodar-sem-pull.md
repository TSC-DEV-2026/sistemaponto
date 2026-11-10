# Log — rodar sem pull

**Data:** 2026-11-10  
**Sessão:** opção de atualizar o código no atalho de rodar

---

## ✅ O que foi feito

- O `rodar.bat` pergunta se o código deve ser atualizado antes de subir.
- A opção 1 faz o `git pull`. A opção 2 segue com o código que já está na pasta.
- Dependências, banco e a subida do backend e do site continuam nos dois casos.

## 📁 Arquivos criados

- `_logs/2026-11-10_rodar-sem-pull.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `rodar.ps1` — a atualização do código passou a depender da escolha.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Escolha diferente de 1 ou 2 encerra sem iniciar nada.
- A pergunta fica no `rodar.ps1`, no mesmo estilo do `testar.ps1`. O `.bat` continua só abrindo esse script.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
