# Log — campos da norma

**Data:** 2026-11-18  
**Sessão:** gravação das medidas da norma

---

## ✅ O que foi feito

- A norma passou a guardar tolerância, intervalo mínimo, início e fim do período noturno e o percentual do adicional.
- O intervalo mínimo é informado como duração, no formato 01:00, 02:00 ou 01:30. O cadastro novo abre com 10 minutos de tolerância, 01:00 de intervalo, 22:00, 05:00 e 20%.
- As normas que já existiam receberam os mesmos padrões. A observação antiga permaneceu.
- O texto livre da norma, antes chamado Regras de ponto, passou a se chamar Observação.
- A apuração passou a ler a norma vigente: tolerância, intervalo mínimo, período noturno e percentual do adicional.
- A jornada deixou de ter tolerância. Em Apuração do dia, Horário previsto passou a Horário contratado.
- O intervalo menor do que o mínimo aparece em Ver detalhes, na aba Ponto.

## 📁 Arquivos criados

- `backend/alembic/versions/0028_norm_measures.py` — colunas na tabela `norms`
- `backend/alembic/versions/0029_norm_interval_hours.py` — intervalo mínimo passa de minutos para horas
- `backend/alembic/versions/0030_norm_interval_clock.py` — intervalo mínimo no formato 01:30
- `backend/alembic/versions/0031_journey_tolerance.py` — remove a tolerância da jornada
- `_logs/2026-11-18_campos-da-norma.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — colunas da norma
- `backend/app/schemas/workforce.py` — entrada e saída da norma
- `backend/app/services/workforce_service.py` — validação ao gravar
- `backend/app/services/company_defaults.py` — norma padrão com os mesmos valores
- `backend/tests/test_workforce_service.py` — gravação e edição das medidas
- `frontend/src/pages/workforce/catalogs.ts` — campos do formulário
- `frontend/src/pages/workforce/EntityScreens.tsx` — hora e número no cadastro
- `frontend/src/components/workforce/CatalogPanel.tsx` — tipo número e valor inicial
- `frontend/src/services/workforce.service.ts` — campos no tipo do cadastro

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A tolerância fica em minutos. O intervalo mínimo fica gravado como duração de 00:00 a 12:00. O período noturno fica em horário e pode atravessar a meia-noite.
- A tolerância aceita de 0 a 240 minutos e o adicional de 0 a 100.
- A observação continua livre. O texto antigo não foi lido para preencher os campos.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Quem não tem norma vigente continua com tolerância de 10 minutos, intervalo de 01:00, noite das 22:00 às 05:00 e adicional de 20%.
- A tela logada não foi percorrida: o navegador caiu no login.
