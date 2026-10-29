# Log — corte de layout, tabela e horário

**Data:** 2026-10-29  
**Sessão:** corrigir transbordo, colunas de marcações e o seletor de horário

---

## ✅ O que foi feito

- A área principal passa a poder encolher ao lado da sidebar, então o formulário deixa de ser empurrado para fora da tela.
- A tabela de marcações distribui Funcionário, Data, Hora e Origem. A origem fica na mesma linha do complemento quando cabe.
- Os quatro horários da jornada usam o seletor `TimePickerField`, no formato `HH:mm` que a API já exige.

## 📁 Arquivos criados

- `frontend/src/components/ui/time-picker-field.tsx`

## ✏️ Arquivos modificados

- `frontend/src/components/layouts/AppShell.tsx`
- `frontend/src/components/workforce/module-visual.ts`
- `frontend/src/components/workforce/PunchDay.tsx`
- `frontend/src/pages/workforce/EntityScreens.tsx`
- `frontend/src/pages/workforce/JourneyPage.tsx`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O seletor de horário entrou só nos campos da jornada. Os outros horários nativos ficaram como estavam.
- O valor enviado continua `HH:mm`, com hora de 00 a 23 e minuto de 00 a 59. Campo vazio continua opcional.

## 🐛 Problemas encontrados e soluções

- A checagem de tipos passou. Não houve sessão no navegador para medir a sidebar aberta e fechada.

## 📌 Pendências / próximos passos

- Conferir no navegador o formulário de jornada, a tabela de marcações e o seletor nos valores 00:00 e 23:59.
