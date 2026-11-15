# Log — valor atual nas abas da ficha

**Data:** 2026-11-15  
**Sessão:** passo 4 do valor atual nas abas

---

## ✅ O que foi feito

- O valor que vale hoje aparece no conteúdo, antes de Alterar função, Alterar jornada e os demais.
- Quando não há valor, o texto diz "Não informado".
- Depois de salvar um vínculo ou um grupo, esse texto é atualizado.
- A ordem das abas fica Dados, Função, Jornada, Grupos, Equipe, Sindicato, Gestor e Situação.
- Banco de horas, Correção e Ausências saíram da edição do funcionário. O interruptor de uso do banco permanece em Dados.

## 📁 Arquivos criados

- `_logs/2026-11-15_valor-atual-nas-abas.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — o valor atual entra antes do formulário e a aba Grupos sobe

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O gestor aparece como um nome. Vários gestores ficam para o passo seguinte.
- A aba se chama Grupos. A legenda é "Grupo atual" com um valor e "Grupos atuais" com vários. A lista fica na caixa com rolagem, no mesmo formato da aba Trabalho.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Os passos seguintes (avisos, filtros de relatório e vários gestores) ainda não foram feitos.
