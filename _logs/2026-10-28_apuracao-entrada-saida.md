# Log — entrada e saída na apuração

**Data:** 2026-10-28  
**Sessão:** mostrar a primeira entrada e a última saída no resumo da apuração

---

## ✅ O que foi feito

- O resultado do dia passou a devolver a primeira marcação e a última saída já usadas no cálculo.
- O card e o demonstrativo exibem esses horários. Dia sem saída fechada mostra "—".

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `backend/app/core/time_result.py` — inclui os dois horários no resultado, sem alterar os minutos
- `backend/app/schemas/workforce.py` — contrato do dia
- `backend/tests/test_workforce_service.py` — confere 08:00 e 17:48 no dia de exemplo
- `frontend/src/services/workforce.service.ts` — tipos
- `frontend/src/utils/labels.ts` — hora em São Paulo
- `frontend/src/components/workforce/apuracao-day.tsx` — card e demonstrativo
- `frontend/src/components/workforce/apuracao-session.ts` — aceita a consulta antiga sem esses campos

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A última saída só aparece quando o dia fecha um par. Ponto incompleto mostra a entrada e deixa a saída em "—".
- As horas previstas, trabalhadas e demais minutos não foram recalculados.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Apurar de novo para a lista guardar a resposta que já traz os horários.
