# Log — vazio na aba Trabalho

**Data:** 2026-10-20  
**Sessão:** ponto 17 do plano, só o site

---

## ✅ O que foi feito

- Na aba Trabalho do funcionário, cargo, jornada, centro de custo, unidade, setor, equipe, sindicato e gestor sem valor passam a exibir "Não possui"
- O traço deixa de aparecer nesses oito campos
- O aplicativo não tem essa aba, então não foi alterado

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeePage.tsx` — texto do valor vazio na aba Trabalho

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- A troca vale só para a aba Trabalho. Horário da jornada, ficha de catálogo e outras telas continuam com o traço onde ele não é valor vazio de vínculo

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
