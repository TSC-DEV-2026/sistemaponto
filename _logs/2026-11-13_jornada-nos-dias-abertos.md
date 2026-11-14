# Log — jornada nos dias em aberto

**Data:** 2026-11-13  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- A apuração de um dia em aberto passou a usar a configuração atual da jornada, mesmo que o dia seja anterior à data da edição.
- Ao fechar um período, a jornada que estava valendo fica gravada nele. Uma edição posterior não altera esses dias.
- Reabrir ou cancelar o período solta essa gravação, e os dias voltam a seguir a configuração atual.
- A troca de jornada na ficha do funcionário continua por data.

## 📁 Arquivos criados

- `backend/alembic/versions/0017_closing_journey_pins.py` — tabela que guarda a versão da jornada de cada período fechado
- `_logs/2026-11-13_jornada-nos-dias-abertos.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — modelo da gravação no fechamento
- `backend/app/models/__init__.py` — exporta o modelo
- `backend/app/repositories/workforce_repository.py` — consulta e apaga as gravações
- `backend/app/services/workforce_service.py` — dia aberto usa a jornada atual; fechamento grava a versão
- `backend/tests/test_workforce_service.py` — cobre dia aberto, período fechado e reabertura
- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — o formulário explica a regra e só pede data quando a quantidade de dias muda
- `frontend/src/pages/workforce/journey.ts` — o texto da apuração descreve a regra
- `cursor_instructions_ponto/07-HISTORY-VIGENCY-AND-AUDIT.md` — a vigência do funcionário segue por data; a configuração da jornada segue o período em aberto

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A data “vale a partir de” deixou de cortar os dias em aberto. Ela só permanece quando a quantidade de dias da sequência muda, para marcar em que data cada pessoa entra no novo dia.
- Um período fechado antes desta alteração, e ainda sem gravação, continua na versão cuja data cobre o dia. A próxima edição da jornada grava essa versão antes de criar a nova, para o período fechado não mudar.

## 🐛 Problemas encontrados e soluções

- Sem a gravação no fechamento, um dia fechado voltaria para a versão antiga assim que a edição tivesse data posterior a ele. A gravação feita no momento do fechamento segura a versão que a apuração estava usando.

## 📌 Pendências / próximos passos

- Aplicar a migration `0017_closing_journey_pins` no banco antes de fechar um período com este código.
