# Log — telas de ajustes e ocorrências

**Data:** 2026-10-29  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A lista de Ajustes e Ocorrências usa as abas do módulo, o cabeçalho curto e a tabela de lançamentos.
- O botão da aba segue o nome do tipo: Novo ajuste, Novo lançamento, Nova falta, Novo atestado, Novas férias, Novo abono e Novo afastamento.
- O registro abre em outra tela, com o mesmo título do botão.
- O selo de solicitação aprovada fica verde. Em Solicitações, pendente fica laranja e recusada fica vermelha.
- Apuração, banco de horas e marcações ganharam título e subtítulo curto.
- A foto do atestado usa a faixa de arrastar e escolher arquivo.
- Configurações saiu do menu lateral. O acesso continua no cabeçalho.

## 📁 Arquivos criados

- `frontend/src/pages/workforce/OccurrencePages.tsx` — lista e formulário do módulo

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — a tela do módulo aponta para a página nova
- `frontend/src/page-headings.ts` — título da rota de registro
- `frontend/src/pages/workforce/OperationsPages.tsx` — a tela antiga saiu daqui e o selo de solicitação ganhou cor
- `frontend/src/components/workforce/TimeOffFields.tsx` — variante visual do módulo e a faixa da foto
- `frontend/src/components/ui/site-select.tsx` — placeholder fora da lista de opções
- `frontend/src/utils/labels.ts` — nomes dos lançamentos e cores de status
- `frontend/src/navigation.ts` — Configurações saiu do menu lateral
- `frontend/src/pages/workforce/JourneyPage.tsx` — cabeçalho do banco de horas
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — cabeçalho da apuração
- `frontend/src/components/workforce/PunchDay.tsx` — subtítulo das marcações
- `frontend/src/pages/workforce/EmployeePage.tsx` — selo colorido da solicitação
- `frontend/src/pages/workforce/EntityScreens.tsx` — ação ao lado das abas
- `frontend/src/components/layouts/AppHeader.tsx` — título do registro conforme o tipo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Administrador registra todos os tipos. Gestor registra só abono, atestado, afastamento e férias.
- O corpo enviado à API permanece o mesmo.
- A ficha do funcionário continua com o formulário antigo.
- Não há botões de editar ou excluir, porque a lista não tinha essas ações.
- Pendente e recusada não entram na lista de ajustes. Elas ficam em Solicitações.

## 🐛 Problemas encontrados e soluções

- O botão de lançamento fica na linha das abas, no canto direito.

## 📌 Pendências / próximos passos

- Conferir no navegador, com administrador e com gestor, as sete abas, o registro e a lista.
