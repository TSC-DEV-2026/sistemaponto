# Log — jornadas programada, carga e livre

**Data:** 2026-11-09  
**Sessão:** backend do ponto 12

---

## ✅ O que foi feito

- A API passou a gravar e apurar três tipos de jornada: programada, carga e livre.
- A escala já cadastrada vira programada de sete dias, com segunda a sexta nos horários atuais e sábado e domingo de folga.
- Quem já está nessa escala recebe o dia da semana em que a vigência começou, para o dia de trabalho não mudar.
- O payload antigo, só com os quatro horários, continua criando a programada 5x2.
- A resposta ainda devolve os quatro horários do dia de trabalho vigente.

## 📁 Arquivos criados

- `backend/app/core/journey_plan.py` — ciclo, semana, dias e horários da jornada.
- `backend/alembic/versions/0013_journey_kinds.py` — converte jornadas e vigências que já existem.
- `_logs/2026-11-09_jornadas-programada-carga-livre.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — versão da jornada, dias, trechos e dia do ciclo na vigência.
- `backend/app/schemas/workforce.py` — entrada e saída dos três tipos, com os horários antigos.
- `backend/app/repositories/workforce_repository.py` — leitura das versões, dias, trechos e vigências da jornada.
- `backend/app/services/workforce_service.py` — gravação versionada, ciclo e fechamento da carga.
- `backend/app/services/company_defaults.py` — jornada padrão nasce como programada de sete dias.
- `backend/app/core/time_result.py` — apuração da programada, da carga e da livre.
- `backend/tests/test_workforce_service.py` — folga, ciclo, flexível, carga, livre, vigência e turno noturno.
- `backend/tests/test_openapi.py` — a busca das listas encontra a rota no FastAPI 0.142.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- As colunas dos quatro horários permanecem. A migração não apaga o que o site antigo lê.
- Sem o dia do ciclo, a API usa o dia da semana da data de início.
- Turno que termina no mesmo dia mantém o corte das 05:00, para a entrada do dia seguinte não fechar o dia anterior.
- Turno que passa da meia-noite, carga e livre não usam esse corte.
- Trabalho em folga da programada vira hora extra.
- O site não foi alterado.

## 🐛 Problemas encontrados e soluções

- Tirar o corte das 05:00 de toda jornada fazia a entrada das 08:00 do dia seguinte fechar um ponto incompleto. O corte ficou só na programada que termina no mesmo dia.
- O teste das listas não via as rotas no FastAPI 0.142, que deixa o roteador incluído sem achatar o caminho. O teste passou a percorrer esses roteadores.

## 📌 Pendências / próximos passos

- Rodar `alembic upgrade head` no banco local antes de usar a API.
- O site ainda não cadastra dias, carga nem livre.
