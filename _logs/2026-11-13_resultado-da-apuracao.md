# Log — resultado da apuração

**Data:** 2026-11-13  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- O resultado da apuração lista cada dia com data, situação e as colunas Entrada, Saída, Hora extra e Falta de tempo alinhadas.
- Banco de horas entra na linha só quando a pessoa usa banco. No detalhe do dia, o demonstrativo continua com essa linha.
- A situação fica numa etiqueta do tamanho do texto: Falta, o aviso do dia ou Sem ocorrência, cada uma com ícone.
- O filtro do dia virou o campo Situação, na largura do bloco. Dias para conferir ficou amarelo.
- Corrigir marcações, lançar falta e atestado ou abono usam o diálogo do dia, sem o demonstrativo de horas. Atestado ou abono vale só para aquele dia.
- A correção exige marcações em pares e usa o seletor de hora do site. O painel do horário abre por cima do diálogo.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/TimeResultsPanel.tsx` — resumo, filtro e colunas do dia
- `frontend/src/components/workforce/apuracao-day.tsx` — cartão do dia, situação e banco de horas
- `frontend/src/components/workforce/ApuracaoDialog.tsx` — diálogo do dia sem faixa extra
- `frontend/src/components/workforce/PunchDay.tsx` — pares de marcação e seletor de hora
- `frontend/src/components/workforce/TimeOffFields.tsx` — atestado ou abono preso ao dia do diálogo
- `frontend/src/components/ui/time-picker-field.tsx` — painel do horário fora da área rolável

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O cartão do dia permanece cinza. A cor fica na etiqueta da situação.
- Intervalo menor do que o previsto continua com o texto que o backend envia.
- Banco de horas some da linha quando `balance_minutes` vem nulo. O detalhe do dia não esconde a linha.

## 🐛 Problemas encontrados e soluções

- O seletor nativo de hora do navegador foi trocado pelo campo do site. O painel foi para o documento para não ser cortado pelo diálogo.

## 📌 Pendências / próximos passos

- Conferir na tela, com login, o resultado, o filtro, o banco de horas e a correção do dia.
