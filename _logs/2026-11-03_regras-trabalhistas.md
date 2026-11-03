# Log — visual das regras trabalhistas

**Data:** 2026-11-03  
**Sessão:** redesign da área de conteúdo de Regras Trabalhistas

---

## ✅ O que foi feito

- Sindicatos, convenções, feriados e regras de ponto passaram a usar a largura do conteúdo, com a cápsula de abas já aprovada.
- A frase sobre feriado, sindicato e acordo saiu da tela. A regra continua no sistema.
- A pesquisa, o filtro de sindicato e os registros seguem o card da estrutura organizacional.
- Nova convenção, edição e visualização ficaram num card na largura do conteúdo, com início e fim lado a lado.
- Na visualização, os campos ficam em duas colunas, no bloco da ficha. O vazio mostra "Não informado", em cinza. A observação ocupa a linha inteira.
- Enquanto a jornada carrega, a ficha mostra o spinner. Campo sem valor mostra "Não informado" no lugar do traço, também em data, período, marcação, ocorrência e horário da ficha.
- A visualização de unidade, setor, equipe, cargo e centro de custo passou a usar o mesmo bloco de campo da ficha e do sindicato.
- O topo ficou com Voltar à esquerda. O título da seção, como Informações da jornada, ficou maior que os campos. A faixa verde saiu.
- A visualização da jornada, da jornada na ficha e do motivo passou a mostrar cada campo no mesmo bloco da convenção.
- O rótulo do filtro, como Sindicato e Unidade, ficou acima do campo. A busca também ganhou o rótulo Nome em cima.
- A paginação continua a de jornada e ponto.

## 📁 Arquivos criados

- `_logs/2026-11-03_regras-trabalhistas.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — a página do módulo.
- `frontend/src/pages/workforce/EntityScreens.tsx` — listagem, blocos e formulários.
- `frontend/src/pages/workforce/EmployeePage.tsx` — jornada prevista e valor vazio.
- `frontend/src/pages/workforce/JourneyPage.tsx` — topo do ajuste e do lançamento.
- `frontend/src/pages/workforce/OccurrencePages.tsx` — observação vazia e topo do lançamento.
- `frontend/src/pages/workforce/ApuracaoDayPage.tsx` — topo da apuração.
- `frontend/src/components/workforce/apuracao-day.tsx` — título do dia.
- `frontend/src/components/workforce/PunchDay.tsx` — marcação sem traço.
- `frontend/src/utils/labels.ts` — data, período e atestado sem traço.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- As abas seguem a cápsula de Pessoas e Estrutura Organizacional, não o botão verde sólido.
- Não houve mudança de API, cálculo, permissão ou campo.

## 🧪 Como testar

1. Abrir Regras Trabalhistas e percorrer as quatro abas.
2. Pesquisar, filtrar sindicato nas convenções e paginar.
3. Abrir, editar e criar uma convenção, conferindo início e fim. Campo vazio aparece como "Não informado".
4. Conferir feriado, sindicato e regra de ponto.

## ❗ Problemas encontrados

- O navegador isolado não entra no sistema local. A conferência visual logada ficou com quem usa a tela.
