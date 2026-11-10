# Log — edição do funcionário

**Data:** 2026-11-10  
**Sessão:** devolver vínculos, ponto e ocorrência na edição do funcionário

---

## ✅ O que foi feito

- A edição do funcionário ganhou uma aba para cada ação: dados, cargo, jornada, centro de custo, equipe, sindicato, gestor, situação, banco de horas, correção e ocorrências.
- A ficha de visualização continua só de consulta.
- Na jornada programada, o dia da sequência aparece junto da data de início, com a sugestão do dia da semana quando a sequência tem sete dias.
- Voltar na edição de alguém que já existe leva para a ficha dessa pessoa.

## 📁 Arquivos criados

- `_logs/2026-11-10_edicao-do-funcionario.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — abas e formulários de vínculo, jornada, banco, correção e ocorrência.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Cada vínculo fica na própria aba, para não misturar várias ações na mesma tela.
- Unidade e setor continuam acompanhando a equipe.
- O dia da sequência usa a lista já carregada na aba, sem esperar outra consulta.
- O backend não mudou. A vigência já aceita o dia da sequência.

## 🐛 Problemas encontrados e soluções

- O campo do dia da sequência demorava a aparecer porque a tela pedia a jornada de novo. → Passou a usar o tipo e o tamanho que a lista da aba já trouxe.

## 📌 Pendências / próximos passos

- —

## 🧪 Como testar

1. Abrir a edição de um funcionário e conferir as abas. Voltar leva à ficha.
2. Em Cargo, escolher um cargo e a data de início e salvar.
3. Em Jornada, escolher uma programada. O dia da sequência aparece na hora. Salvar com a data de início.
4. Lançar banco de horas, corrigir um dia e registrar uma ocorrência nas abas correspondentes.
