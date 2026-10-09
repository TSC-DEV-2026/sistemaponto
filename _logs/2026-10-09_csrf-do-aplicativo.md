# Log — CSRF do aplicativo

**Data:** 2026-10-09  
**Sessão:** login do aplicativo no celular

---

## ✅ O que foi feito

- O login do aplicativo deixou de exigir o token de CSRF do site
- A checagem continua no modo cookie, que é o do site
- A API passou a declarar `python-multipart`, exigido pelo envio da foto

## 📁 Arquivos criados

- `backend/tests/test_csrf.py` — aplicativo sem CSRF, site com CSRF, Bearer sem CSRF

## ✏️ Arquivos modificados

- `backend/app/api/middleware.py` — CSRF só quando o transporte é cookie
- `backend/requirements.txt` — `python-multipart`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- `python-multipart` — formulário da foto do atestado e da selfie

## ⚠️ Decisões tomadas

- O aplicativo já envia `X-Client: mobile` e não guarda cookie. O APK não mudou
- Origem conhecida do site continua em modo cookie, mesmo com o header `mobile`

## 🐛 Problemas encontrados e soluções

- O celular recebia "CSRF inválido" no login. As tentativas durante a reinicialização ainda caíram no processo anterior

## 📌 Pendências / próximos passos

- —
