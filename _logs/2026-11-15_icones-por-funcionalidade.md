# Log — ícones por funcionalidade

**Data:** 2026-11-15  
**Sessão:** um ícone para cada funcionalidade no site

---

## ✅ O que foi feito

- Cada funcionalidade passou a ter um ícone só, reunido em um mapa.
- Funcionário deixou de usar o mesmo ícone da equipe. Equipe continua o grupo de pessoas. Funcionário é uma pessoa. O menu Quadro usa um cartão de contato.
- Sindicato deixou de usar o prédio da empresa. Setor deixou de usar camadas na ficha. Jornada deixou de usar o relógio do ponto.
- Os filtros do relatório e da alteração em massa usam o mesmo ícone do conceito, inclusive a situação.
- As abas de Ponto ganharam ícone: apurações, banco de horas e fechamento.
- Setor voltou a ser a rede. A Estrutura Organizacional passou a ser uma pirâmide, para não repetir esse desenho.
- O menu Ausências passou a se chamar Ocorrências, com o ícone de caderno. A prancheta continua em regras de ponto e ajustes.
- As abas de Ocorrências ficaram nesta ordem: abonos, atestados, faltas, afastamentos e férias.
- As abas de Motivos ficaram nesta ordem: abonos, atestados, faltas e ajustes.

## 📁 Arquivos criados

- `frontend/src/utils/concept-icons.ts` — mapa único dos ícones
- `_logs/2026-11-15_icones-por-funcionalidade.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/navigation.ts` — menu Quadro, Ponto, Estrutura, Relatórios, Solicitações e Plano
- `frontend/src/pages/HomePage.tsx` — cartões da home
- `frontend/src/pages/PlanPage.tsx` — plano e funcionários contabilizados
- `frontend/src/pages/workforce/PeoplePage.tsx` — abas do Quadro
- `frontend/src/pages/workforce/JourneyPage.tsx` — abas do Ponto
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — abas e o seletor de cada vínculo
- `frontend/src/pages/workforce/EmployeePage.tsx` — ficha e a aba Trabalho
- `frontend/src/pages/workforce/OperationsPages.tsx` — estrutura, relatório, avisos e totais da folha
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — operações e filtros
- `frontend/src/pages/workforce/EntityScreens.tsx` — listas e formulários dos cadastros
- `frontend/src/pages/workforce/OccurrencePages.tsx` — ícones das abas de ausência
- `frontend/src/components/workforce/employee-combobox.tsx` — funcionário

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Funcionário é uma pessoa. Equipe é o grupo. Quadro, o módulo, é um cartão de contato.
- Empresa é o prédio. Setor é a rede. Sindicato é o monumento. Função é a maleta. Jornada é o calendário com relógio. Grupo é a etiqueta. Gestor é a pessoa com engrenagem. Situação é o selo.
- Ponto é o relógio. Apurações é a prancheta conferida. Banco de horas é o timer. Fechamento é o calendário conferido.
- A aba Trabalho da ficha é uma pasta, para não repetir a maleta da função.
- A Estrutura Organizacional é uma pirâmide. Faltas é a proibição, atestado é o documento, férias é a palmeira, abono é o visto e afastamento é o calendário cortado.
- Desligamento e reativação na massa continuam com ícones de ação, diferentes do selo da situação.

## 🐛 Problemas encontrados e soluções

- A tela não foi conferida logada. O site não estava no ar nesta sessão e o navegador não tem conta aberta.

## 📌 Pendências / próximos passos

- Conferir no site se algum ícone ainda parece repetido ou fora de lugar.
