# Log — docker de produção

**Data:** 2026-11-27  
**Sessão:** imagens da API e do site na rede do Caddy

---

## ✅ O que foi feito

- Dockerfile da API (porta 8003) e do site (nginx com o build do Vite).
- Compose de produção na rede `zioncor-prod_zioncor`, sem porta publicada no host.
- O nginx encaminha `/api` para `sistemaponto-api` e aceita upload até 20 MB.
- O `deploy.sh` atualiza só este repositório. O bloco do Caddy fica em `deploy/sistemaponto.caddy`.

## 📁 Arquivos criados

- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/.dockerignore`
- `docker-compose.prod.yml`
- `deploy/sistemaponto.caddy`
- `deploy.sh`
- `_logs/2026-11-27_docker-de-producao.md`

## ✏️ Arquivos modificados

- —

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Postgres continua externo. Não há imagem de banco.
- Flutter não entra na imagem. `mobile` e `mobile2` seguem buildados na máquina.
- Desenvolvimento local continua no Vite e no uvicorn.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- No servidor, passar a usar o `docker-compose.prod.yml` desta branch depois do merge.
