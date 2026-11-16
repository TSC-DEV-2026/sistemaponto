# Log — ocorrência, fechamento e banco

**Data:** 2026-11-16  
**Sessão:** ficha da ocorrência, seleção do fechamento e lançamento no banco

---

## ✅ O que foi feito

- A lista de ocorrências ganhou ver e editar. A ficha mostra os campos e a edição altera só a observação.
- O dia sem jornada prevista aparece como Sem jornada. O dia cumprido continua Jornada cumprida.
- O banco de horas passou a dizer Somar e Diminuir. Somar e Diminuir pedem confirmação antes de gravar.
- O card do banco no fechamento ficou com pessoa, matrícula e saldo. A lista de lançamentos saiu.
- A escolha de pessoas do novo fechamento ficou igual à operação em massa, com paginação e sem rolagem interna.
- Os filtros do fechamento e do relatório abrem pelo botão de filtro.
- O campo de hora mantém o cursor ao apagar ou digitar no meio.
- Os botões de ação passaram a usar a dica branca no lugar do título nativo.

## 📁 Arquivos criados

- `frontend/src/components/ui/action-tip.tsx` — dica branca dos botões de ação
- `frontend/src/components/ui/duration-field.tsx` — campo de duração com o cursor preservado
- `frontend/src/utils/clock-edit.ts` — máscara e posição do cursor da hora
- `_logs/2026-11-16_ocorrencia-fechamento-banco.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — rotas de ver e editar ocorrência
- `frontend/src/page-headings.ts` — título do lançamento no banco
- `frontend/src/pages/workforce/OccurrencePages.tsx` — ficha, edição e ações da lista
- `frontend/src/components/workforce/apuracao-day.tsx` — Sem jornada e Jornada cumprida
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — rótulo do dia na apuração
- `frontend/src/utils/labels.ts` — nomes do banco e da duração
- `frontend/src/pages/workforce/JourneyPage.tsx` — nomes do banco e campo de horas
- `frontend/src/components/workforce/HourBankPanel.tsx` — nomes do banco e campo de horas
- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — campo de horas da jornada
- `frontend/src/components/ui/time-picker-field.tsx` — cursor compartilhado com a duração
- `frontend/src/components/ui/date-picker-field.tsx` — cursor ao apagar o primeiro dígito
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — card do banco e confirmação do lançamento
- `frontend/src/pages/workforce/ClosingFormPage.tsx` — pessoas, filtros e paginação do fechamento
- `frontend/src/pages/workforce/OperationsPages.tsx` — lista de fechamentos e filtro do relatório
- `frontend/src/pages/workforce/EntityScreens.tsx` — setas de ordenação e dica das ações
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — dica das ações
- `frontend/src/pages/TenantsPage.tsx` — dica das ações
- `frontend/src/pages/MembershipsPage.tsx` — dica das ações
- `frontend/src/pages/workforce/RequestFormPage.tsx` — dica das ações
- `backend/app/core/reports.py` — títulos Somar ao saldo e Diminuir o saldo no PDF

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quitar o saldo continua gravando na hora. Só Somar e Diminuir passam pelo alerta.
- O checkbox da pessoa no fechamento repete o desenho da operação em massa. Não há um componente separado.
- A frase explicativa dos filtros do relatório saiu junto com a grade que ficava sempre aberta. A regra dos filtros continua valendo com o painel fechado.
- O nome do botão ficou Somar e Diminuir. Listas, PDF e o alerta continuam com Somar ao saldo e Diminuir o saldo.

## 🐛 Problemas encontrados e soluções

- Apagar um número no meio da hora jogava o cursor para o fim ou reescrevia o valor. A máscara passou a ser a do relógio e o cursor volta para a posição digitada.
- Apagar o primeiro dígito ainda levava o cursor ao fim. A posição zero agora permanece no início.

## 📌 Pendências / próximos passos

- —
