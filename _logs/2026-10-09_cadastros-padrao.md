# Log — Cadastros padrão da empresa

**Data:** 2026-10-09  
**Sessão:** entidades padrão ao criar o administrador

---

## ✅ O que foi feito

- A empresa nova recebe um cadastro de cada: cargo, centro de custo, unidade, setor, equipe, jornada, sindicato, convenção, regra de ponto e motivo
- A jornada padrão é 08:00–12:00 e 13:30–17:30
- O conjunto entra no cadastro do site, ao abrir outra empresa, ao vincular um administrador e no seed
- Nome que já existe não é duplicado
- O cadastro de funcionário permanece como estava

## 📁 Arquivos criados

- `backend/app/services/company_defaults.py` — cadastros padrão da empresa

## ✏️ Arquivos modificados

- `backend/app/services/auth_service.py` — cadastro de conta
- `backend/app/services/membership_service.py` — vínculo de administrador
- `backend/app/services/seed_service.py` — empresa inicial
- `backend/app/api/routes/tenants.py` — nova empresa de quem já é administrador

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Feriado não entra no padrão. Uma data inventada marcaria dia de folga sem ser feriado
- A regra de ponto padrão descreve tolerância de 10 minutos, intervalo de 1 hora e adicional noturno de 20% das 22:00 às 05:00

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
