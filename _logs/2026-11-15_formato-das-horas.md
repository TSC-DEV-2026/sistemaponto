# Log — formato das horas

**Data:** 2026-11-15  
**Sessão:** mostrar e pedir horas sempre em 000:00

---

## ✅ O que foi feito

- Horas de trabalho, banco, relatório, folha de ponto e app do funcionário passam a aparecer como 000:00.
- O novo lançamento do banco e a carga da jornada passam a pedir 000:00. O valor gravado continua em minutos.
- A tolerância da jornada e o horário do ponto continuam como estão: a tolerância é um número de minutos e o ponto é hora do dia.

## 📁 Arquivos criados

- `backend/app/core/duration.py` — texto 000:00 a partir dos minutos
- `_logs/2026-11-15_formato-das-horas.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — detalhe dos relatórios de ponto e banco
- `backend/tests/test_workforce_service.py` — conferência do texto do relatório
- `frontend/src/utils/labels.ts` — texto 000:00
- `frontend/src/pages/workforce/OperationsPages.tsx` — relatório de ponto
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — grade e folha
- `frontend/src/pages/workforce/JourneyPage.tsx` — novo lançamento do banco
- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — carga semanal
- `mobile/lib/features/app/data/format.dart` — app do funcionário

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Três dígitos de hora e dois de minuto. Acima de 999 horas o texto ganha o dígito que faltar, sem cortar o valor.
- O campo aceita no máximo 999:59 por lançamento.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
