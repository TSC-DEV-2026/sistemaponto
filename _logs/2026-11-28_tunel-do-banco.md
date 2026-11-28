# Log — túnel do banco

**Data:** 2026-11-28  
**Sessão:** acesso local ao Postgres do VPS

---

## ✅ O que foi feito

- O `rodar.ps1` abre o túnel SSH da porta 5434 antes de atualizar o banco.
- Se a porta já estiver aberta, o túnel existente é reaproveitado.
- Fechar a janela encerra o túnel que essa execução abriu.

## 📁 Arquivos criados

- `_logs/2026-11-28_tunel-do-banco.md`

## ✏️ Arquivos modificados

- `rodar.ps1`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A chave usada é `%USERPROFILE%\.ssh\id_ed25519`.
- O `.env` local não entra no Git.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
