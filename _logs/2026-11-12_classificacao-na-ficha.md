# Log — classificação na ficha

**Data:** 2026-11-12  
**Sessão:** ajuste de feature

---

## ✅ O que foi feito

- O filtro de classificações saiu do topo da lista de funcionários.
- A visualização da classificação lista os valores com pesquisa, paginação e Novo valor. O olho abre a tela do valor. Editar e novo valor abrem a própria tela, no formato do cargo.
- Na edição do funcionário, a troca ficou em dois combos: a classificação e o valor, com pesquisa. O botão é Salvar classificação.
- Na ficha, aba Trabalho, as classificações ficam num único campo com rolagem. Não dá para remover dali.

## 📁 Arquivos criados

- `_logs/2026-11-12_classificacao-na-ficha.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — rotas de novo, editar e visualizar valor
- `frontend/src/page-headings.ts` — títulos dessas telas
- `frontend/src/pages/workforce/EntityScreens.tsx` — lista, visualização e formulário do valor
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — troca com dois combos
- `frontend/src/pages/workforce/EmployeePage.tsx` — campo único de classificações na ficha

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O valor segue o mesmo caminho do cargo: lista, olho, lápis e tela própria.
- A ficha não cresce com muitas classificações. A lista rola dentro do campo e não tem exclusão.
- No banco de desenvolvimento, Centro de custo saiu. Ficou Classificação Padrão, com os valores 1 e 2, e os funcionários com Classificação Padrão 1 desde 24/09/2026. Essa carga não entra no Git.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
