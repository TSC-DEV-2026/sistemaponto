# Log — ajuste de marcação

**Data:** 2026-11-18  
**Sessão:** detalhe do ponto e correção do dia

---

## ✅ O que foi feito

- Em Ver detalhes, a aba Ponto mostra só as marcações que valem. Se o dia foi ajustado, aparece um aviso e o motivo.
- Desfazer ajuste devolve as marcações originais e tira o ajuste atual. Uma nova correção substitui a correção anterior, sem mexer de novo no original.
- A correção pede o motivo do tipo Ajuste. A marcação ajustada guarda esse motivo.
- O tipo de motivo que aparecia como Ajuste passou a se chamar Correção.
- No demonstrativo, Noturno passou a H. noturnas e Adicional passou a Adicional (H. noturnas). No fechamento, a coluna Banco no período saiu e entrou H. noturnas. A folha impressa ganhou a coluna H. noturnas.

## 📁 Arquivos criados

- `backend/alembic/versions/0027_punch_reason.py` — coluna `reason_id` em `punches`
- `_logs/2026-11-18_ajuste-de-marcacao.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — motivo na marcação
- `backend/app/schemas/workforce.py` — correção e restauração
- `backend/app/services/workforce_service.py` — troca e desfazer
- `backend/app/api/routes/workforce.py` — `POST /punches/restorations`
- `backend/app/core/workforce.py` — origens que contam como ajuste
- `frontend/src/components/workforce/ApuracaoDialog.tsx` — lista e desfazer
- `frontend/src/components/workforce/PunchDay.tsx` — motivo na correção
- `frontend/src/services/workforce.service.ts` — campo `reason_id`
- `backend/tests/test_workforce_service.py` — segunda correção e restauração

## 🚫 O que NÃO foi feito

- O histórico de marcações, fora do detalhe do dia, continua podendo mostrar o que deixou de valer.

## ⚠️ Pendências

- A tela logada não foi percorrida.

## 🧪 Como validar

1. Abra uma apuração, veja o detalhe do dia e confira só as marcações que valem.
2. Corrija o dia escolhendo um motivo de Ajuste. O detalhe mostra o aviso e esconde o registro original.
3. Corrija de novo. O detalhe fica com a correção nova.
4. Desfaça o ajuste. Voltam as marcações que a pessoa registrou.
