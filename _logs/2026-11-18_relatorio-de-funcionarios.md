# Log — relatório de funcionários

**Data:** 2026-11-18  
**Sessão:** relatório Funcionários e filtro de categoria fora

---

## ✅ O que foi feito

- O relatório Pessoas passou a se chamar Funcionários, com o slug `employees`. O endereço antigo `people` abre o mesmo relatório.
- Cada linha traz matrícula, CPF, empresa, equipe, função, jornada, situação, admissão e se usa banco de horas, no dia consultado.
- Categoria deixou de ser filtro na lista de funcionários e no relatório. O cadastro de categoria continua.

## 📁 Arquivos criados

- `_logs/2026-11-18_relatorio-de-funcionarios.md` — este log

## ✏️ Arquivos modificados

- `backend/app/core/reports.py` — nome e slug do relatório
- `backend/app/services/workforce_service.py` — linha do funcionário e filtro de categoria ignorado
- `backend/app/api/routes/workforce.py` — filtros publicados da lista e do relatório
- `backend/tests/test_workforce_service.py` — relatório de funcionários e lista sem filtro de categoria
- `frontend/src/pages/workforce/OperationsPages.tsx` — tipo Funcionários e bloco de categorias removido

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O relatório de funcionários continua pedindo um dia, porque empresa, equipe, função, jornada e situação valem naquela data.
- O slug antigo `people` continua aceito e devolve `employees`.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A tela logada não foi percorrida neste ambiente.
