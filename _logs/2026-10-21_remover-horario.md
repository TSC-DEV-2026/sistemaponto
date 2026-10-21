# Log — remover horário da marcação

**Data:** 2026-10-21  
**Sessão:** ponto 22 do plano, só o site

---

## ✅ O que foi feito

- No lançamento das marcações de um dia, o botão deixou de se chamar "Tirar"
- O texto passou a ser "Remover", com ícone de lixeira
- Vale para a correção manual do dia e para a solicitação de ajuste, que usam o mesmo campo
- O aplicativo não chama esse botão de Tirar. "Tirar selfie" continua a captura da foto

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/components/workforce/PunchDay.tsx` — texto e ícone do botão que retira um horário

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- A regra de gravar a marcação não mudou. Só o botão
- O ponto 23 não entrou

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
