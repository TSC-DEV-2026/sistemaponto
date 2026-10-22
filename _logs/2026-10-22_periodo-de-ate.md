# Log — período De e Até

**Data:** 2026-10-22  
**Sessão:** ponto 23 do plano, site e aplicativo

---

## ✅ O que foi feito

- Nos formulários de abono, atestado, afastamento e férias, o período passou a se chamar "De" e "Até"
- O mesmo vale para falta e lançamento de marcação, que usam o mesmo formulário
- Férias ficam só em dias. A opção de algumas horas não aparece no site nem no aplicativo
- No atestado, o CID pode ficar vazio. CRM e nome do médico continuam obrigatórios. A foto continua opcional
- A API que recusa férias com horário e aceita CID vazio já estava na main

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/TimeOffFields.tsx` — rótulos, férias só em dias e CID opcional
- `frontend/src/pages/workforce/RequestFormPage.tsx` — texto do atestado
- `frontend/src/pages/workforce/OperationsPages.tsx` — De e Até na ocorrência
- `frontend/src/pages/workforce/EmployeePage.tsx` — De e Até na ficha
- `mobile/lib/features/app/presentation/screens/new_request_screen.dart` — De, Até, férias sem horário e CID opcional

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- O ajuste continua pelo dia e pelas marcações. Ele não usa período De–Até
- O ponto 24 não entrou

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
