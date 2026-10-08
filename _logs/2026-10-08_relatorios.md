# Log — relatórios

**Data:** 2026-10-08  
**Sessão:** ponto 9 do plano, só o backend

---

## ✅ O que foi feito

- O catálogo tem um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão
- Cada relatório lista o histórico do período, com paginação
- O painel operacional continua com os mesmos contadores de hoje

## 📁 Arquivos criados

- `backend/app/core/reports.py` — nomes dos cinco relatórios

## ✏️ Arquivos modificados

- `backend/app/schemas/workforce.py` — catálogo e linhas do relatório
- `backend/app/services/workforce_service.py` — leitura histórica de cada grupo
- `backend/app/api/routes/workforce.py` — catálogo e relatório do período
- `backend/tests/test_workforce_service.py` — catálogo, histórico, escopo da equipe e painel

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Relatório é leitura, como a apuração. Não há cadastro novo nem migration
- Ponto reusa a apuração já gravada nas contas do dia. Jornada reusa a vigência. Banco reusa o saldo e os lançamentos. Ocorrências reusa o que já foi lançado. Gestão lista fechamento e solicitação do período
- Gestor e administrador consultam. Funcionário não consulta relatório gerencial
- O gestor vê a própria equipe. O fechamento, sem filtro de funcionário, continua da empresa
- O período vai até 366 dias. Dia futuro não entra no ponto nem no movimento do banco
- O dashboard não mudou

## 🐛 Problemas encontrados e soluções

- O dublê da lista de funcionários filtrava `employee_id`, campo que o cadastro não tem. O filtro passou a usar o id do funcionário, como o repositório real

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site ainda mostra o catálogo vazio; este corte é só a API
