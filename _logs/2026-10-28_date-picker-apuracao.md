# Log — calendário da apuração

**Data:** 2026-10-28  
**Sessão:** date picker dos campos De e Até

---

## ✅ O que foi feito

- Os campos De e Até da aba Apuração passaram a abrir um calendário próprio
- A data continua indo para a API no formato AAAA-MM-DD
- Dá para digitar DD/MM/AAAA e para pular mês e ano pelo título

## 📁 Arquivos criados

- `frontend/src/components/ui/date-picker-field.tsx`

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/TimeResultsPanel.tsx` — usa o calendário só na aba Apuração

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Não há biblioteca de calendário no projeto, então o componente foi feito na aplicação
- A ficha do funcionário continua com o campo de data do navegador
- Data incompleta ou impossível não substitui a data válida já escolhida

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
