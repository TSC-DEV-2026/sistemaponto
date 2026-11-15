# Log — menu Quadro e Ponto

**Data:** 2026-11-15  
**Sessão:** passo 1 do ajuste de nomes e de lançamentos

---

## ✅ O que foi feito

- O menu passou a se chamar Quadro. Jornadas entrou como aba entre Funções e Grupos.
- O menu passou a se chamar Ponto, com as abas Apurações, Banco de horas e Fechamento.
- Fechamento saiu da barra e entrou em Ponto, à direita de Banco de horas. A lista, o novo fechamento, fechar, cancelar e reabrir continuam os mesmos. O endereço `/closings` abre essa aba.
- Na aba Fechamento, o título antigo e o ícone do filtro saíram. O botão Novo fechamento ficou alinhado às abas, no mesmo lugar do Novo lançamento. A legenda ficou "Fechamento" e "Consulte os períodos de fechamento."
- O administrador da conta deixou de ver Registro. Se abrir o endereço, volta para o início. Funcionário e gestor continuam vendo. O nome no menu é Registro.
- Lançamento novo de banco aceita só crédito e débito. O filtro da lista segue os mesmos dois tipos. Quitação já gravada continua na lista, com esse nome, e continua no saldo.
- As abas de Ausências ficaram no plural: Faltas, Atestados, Férias, Abonos e Afastamentos. O registro individual continua no singular.
- No aplicativo do funcionário, a aba de banco deixou de falar em quitação. O relógio compartilhado não tinha tela desse passo.

## 📁 Arquivos criados

- `_logs/2026-11-15_menu-pessoal-e-resultados.md` — este log

## ✏️ Arquivos modificados

- `backend/app/schemas/workforce.py` — lançamento novo aceita crédito ou débito
- `backend/app/services/workforce_service.py` — recusa quitação nova e mantém a quitação antiga no cálculo
- `backend/tests/test_workforce_service.py` — cobre a recusa e o saldo da quitação já gravada
- `frontend/src/navigation.ts` — nomes do menu e ocultação do registro para o administrador
- `frontend/src/components/layouts/AppShell.tsx` — aplica a ocultação
- `frontend/src/App.tsx` — jornadas em Quadro e redirecionamento dos endereços antigos
- `frontend/src/page-headings.ts` — títulos das páginas
- `frontend/src/pages/workforce/PeoplePage.tsx` — aba Jornadas
- `frontend/src/pages/workforce/JourneyPage.tsx` — Ponto, Apurações e lançamento sem quitação
- `frontend/src/pages/workforce/catalogs.ts` — volta da jornada para Quadro
- `frontend/src/pages/workforce/EntityScreens.tsx` — ícone da lista de jornadas
- `frontend/src/pages/workforce/OccurrencePages.tsx` — abas no plural
- `frontend/src/pages/workforce/OperationsPages.tsx` — administrador não permanece em Registro de Ponto
- `frontend/src/pages/HomePage.tsx` — texto do painel aponta para Ponto
- `frontend/src/pages/MembershipsPage.tsx` — texto aponta para Quadro
- `frontend/src/components/workforce/HourBankPanel.tsx` — filtro e formulário sem quitação
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — título Apurações
- `frontend/src/utils/labels.ts` — rótulos das abas e dos lançamentos
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — texto do banco
- `cursor_instructions_ponto/01-PRODUCT-VISION-AND-SCOPE.md` — nomes do menu
- `cursor_instructions_ponto/02-WEB-ADMIN-SCOPE.md` — resultados, jornadas e registro
- `cursor_instructions_ponto/03-MOBILE-APP-SCOPE.md` — crédito e débito ficam na web
- `cursor_instructions_ponto/04-BUSINESS-RULES-AND-WORKFLOWS.md` — quitação nova recusada
- `cursor_instructions_ponto/05-NAVIGATION-AND-UX.md` — sidebar

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A quitação antiga permanece no banco e no relatório. Só o lançamento novo foi recusado.
- O endereço antigo da jornada redireciona para Quadro, para um favorito já salvo continuar abrindo.
- O nome Pessoal foi trocado por Quadro na mesma sessão. O nome Resultados foi trocado por Ponto.
- Fechamento deixou de ser um item da barra e passou a ser a aba Fechamento dentro de Ponto.
- O relógio compartilhado ficou de fora porque não tem menu, banco nem ausências.

## 🐛 Problemas encontrados e soluções

- Os testes criavam quitação pela mesma função do lançamento. A quitação antiga passou a ser inserida direto no repositório de memória, e o lançamento pela função passou a esperar a recusa.

## 📌 Pendências / próximos passos

- Os passos seguintes (matrícula na busca, exclusão de ausência, valor atual nas abas, avisos, filtros de relatório e vários gestores) ainda não foram feitos.
