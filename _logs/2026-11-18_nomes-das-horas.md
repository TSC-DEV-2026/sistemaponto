# Log — nomes das horas

**Data:** 2026-11-18  
**Sessão:** nomes da apuração, da folha e da impressão

---

## ✅ O que foi feito

- Falta de tempo passou a se chamar H. faltantes. Horas previstas passou a H. contratadas. Atraso passou a H. em atraso. Na apuração, no demonstrativo, no fechamento e nos totalizadores da folha o nome fica abreviado.
- Saída antecipada saiu da apuração, do fechamento, da folha e do aplicativo. O tempo a menos continua em H. faltantes.
- O campo calculado `expected_minutes` passou a `contracted_minutes`. Não havia coluna no banco. `shortage_minutes` e `delay_minutes` continuam, porque já nomeiam horas faltantes e horas em atraso.
- A legenda da impressão, do demonstrativo, do fechamento e da folha ficou H. trabalhadas, H. extras e H. faltantes.
- O dia de falta na folha impressa mostra o total daquele dia, no formato 08:00, e a linha continua vermelha.
- O aplicativo do funcionário usa os mesmos nomes no resumo do dia.

## 📁 Arquivos criados

- `_logs/2026-11-18_nomes-das-horas.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/apuracao-day.tsx` — cartão do dia e demonstrativo
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — resumo da apuração
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — colunas, notas e total do dia na folha
- `frontend/src/utils/report-pdf.ts` — títulos da folha e marca do dia de falta
- `frontend/src/pages/workforce/OperationsPages.tsx` — totais da folha e relatório de ponto
- `frontend/src/pages/workforce/journey.ts` — texto da jornada de carga
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — resumo do dia

## 🚫 O que NÃO foi feito

- O cálculo das horas não mudou. Os campos da API continuam os mesmos.
- A situação Falta, que indica o dia sem marcação, o motivo Falta e a aba Faltas ficaram como estavam.
- O painel inicial não mostra essas horas, então não teve texto para trocar.

## ⚠️ Pendências

- A tela logada não foi percorrida nesta sessão.
- Nada foi commitado.

## 🧪 Como validar

1. Abra uma apuração e confira o demonstrativo: H. contratadas, H. trabalhadas, H. em atraso, H. extras e H. faltantes.
2. Abra um fechamento e imprima a folha. Os títulos da grade são H. trabalhadas, H. extras e H. faltantes. No rodapé, H. contratadas, H. faltantes e H. em atraso.
3. Num dia sem marcação, a coluna de horas faltantes mostra o total do dia, como 08:00 ou 08:48, e a linha segue vermelha.
