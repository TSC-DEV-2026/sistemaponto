# Roteiro de hospedagem e produção

Ordem até o primeiro cliente em servidor. Desenvolvimento continua na máquina (venv, Vite, Postgres local). Docker é de **produção**. Site e `/api` no mesmo origin (nginx). Senha e pessoa global ficam no autenticador (`auther`).

A performance de código que deve existir **antes** de hospedar está nos Pontos 16 a 23 de `09-PLANO-DE-DESENVOLVIMENTO.md`. Este arquivo não repete esses itens: assume que eles foram feitos e medidos no ambiente de desenvolvimento com volume próximo ao do cliente.

---

## Pré-requisito

- Pontos 16–23 do plano de desenvolvimento (índices, site, apuração, aparelho, fechamento/relatórios, paginação real, folha/fiscal) concluídos ou explicitamente adiados com motivo.
- Domínio do cliente definido (ex.: `ponto.empresa.com.br`).
- Conta Cloudflare R2 e bucket para fotos/anexos.
- Decisão: onde roda o `auther` (mesmo VPS, outro VPS ou já em produção).
- Decisão: Postgres no VPS ou gerenciado.
- SMTP opcional no dia 1 (avisos só no sistema são aceitáveis no início).

---

## Etapa 1 — Código de produção no repositório

O playbook exige Dockerfile e compose de produção versionados. O `auther` já tem modelo; o `sistemaponto` ainda precisa.

1. `Dockerfile` da API (Python, porta 8003, `uvicorn` com `--proxy-headers` e workers 2–4 conforme CPU).
2. `Dockerfile` do frontend: build Vite; nginx serve o `dist` e encaminha `/api` para a API.
3. `docker-compose.prod.yml`: serviços `api` + `web` (Postgres no compose ou URL externa).
4. Subida: `alembic upgrade head` antes ou no start controlado da API.
5. README de produção: como buildar, variáveis e smoke mínimo.
6. App (`mobile` / `mobile2`): build com `API_URL=https://domínio` (sem IP de LAN).

`ENVIRONMENT=production` já desliga `/docs`, `/redoc` e `/openapi.json` e reduz detalhe de erro 500. Não reinventar isso.

---

## Etapa 2 — Autenticador global

1. `auther` em HTTPS estável (login e redirect dependem dele).
2. `REDIRECT_ALLOWLIST` com a URL pública do site do ponto.
3. `AUTHENTICATOR_API_KEY` idêntica no `.env` do auther e do sistemaponto.
4. Expor o auther só o necessário (rede privada ou restrição por IP, se a API do ponto for a única cliente interna).

---

## Etapa 3 — Servidor

Sugestão no dia 1: Ubuntu LTS, 2 vCPU / 4 GB RAM / 40+ GB disco.

1. Usuário de deploy com SSH por chave; sem login root por senha.
2. Docker Engine + plugin Compose.
3. Firewall (UFW): 22, 80, 443.
4. DNS A/AAAA do domínio no VPS.
5. TLS (Caddy, nginx+Certbot ou Traefik).
6. Timezone `America/Sao_Paulo` no SO (e no container, se logs/datas do SO importarem).

---

## Etapa 4 — Segredos e `.env` de produção

Arquivo **só no servidor**, nunca no git.

| Variável | Valor esperado |
|---|---|
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` / `PUBLIC_APP_URL` | `https://domínio` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` |
| `DATABASE_URL` | Postgres com senha forte |
| `JWT_SECRET_KEY` | Novo, longo, único |
| `AUTHENTICATOR_BASE_URL` | URL HTTPS (ou HTTP interno se rede privada) |
| `AUTHENTICATOR_API_KEY` | Igual ao auther |
| `R2_*` | Account, keys, bucket, endpoint — testar um upload |

`SEED_*` só na primeira subida, se ainda for o fluxo de bootstrap da empresa.

---

## Etapa 5 — Primeiro deploy

1. Artefato: tag de release ou `main` já aceita (GitHub Flow + squash).
2. `docker compose -f docker-compose.prod.yml up -d --build`.
3. Migrações aplicadas; health da API atrás do nginx.
4. Smoke: `https://domínio` → login → troca de empresa → uma tela de ponto.
5. Smoke fiscal: gerar AFD ou totais da folha no mesmo host (pedido curto).

---

## Etapa 6 — Aplicativos

1. Build do `mobile` (e `mobile2` se o cliente usar aparelho compartilhado) apontando para a API de produção.
2. Distribuir só depois do smoke de marcação (simples / QR / face, conforme o tipo da ficha).
3. Conferir fila offline, pending e download de faces na home.

---

## Etapa 7 — Operação contínua

1. Backup diário do Postgres + teste de restore (pelo menos mensal).
2. Rotação de logs Docker; alerta de disco.
3. Update: tag → pull/build → compose up → migrate → smoke curto.
4. Janela de manutenção comunicada (v1 sem zero-downtime obrigatório).
5. Contato se auther, R2 ou o VPS cair.

---

## Etapa 8 — Ajustes de desempenho **depois** do go-live

Só com métrica de uso real no cliente. Não antecipar Redis, segunda máquina ou redesign sem evidência.

1. Revisar queries lentas no Postgres (além dos índices do Ponto 16).
2. Ajustar workers do Uvicorn e pool do Postgres.
3. Se gerar fiscal ainda travar: reforçar job em segundo plano (Ponto 23).
4. Cache/Redis ou novo nó — apenas com gargalo medido.

---

## O que não fazer no dia 1

- Kubernetes, multi-região ou CDN “por precaução”.
- Docker da aplicação como ambiente de desenvolvimento.
- API em subdomínio separado quebrando cookie first-party (playbook: mesmo host, `/api` no nginx).
- Subir sem backup e sem TLS.
- Empurrar `main` direto sem PR.

---

## Checklist rápido

- [ ] Pontos 16–23 (ou adiamentos documentados)
- [ ] Docker + nginx + compose no repo
- [ ] Auther HTTPS + allowlist + API key
- [ ] VPS: Docker, UFW, DNS, TLS
- [ ] `.env` de produção
- [ ] Deploy + migrate + smoke site
- [ ] App com URL de produção
- [ ] Backup e processo de update
