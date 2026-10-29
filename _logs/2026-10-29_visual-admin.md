# Log — acabamento visual do administrador

**Data:** 2026-10-29  
**Sessão:** padronizar ações e formulários do módulo Jornada e Ponto que o administrador vê

---

## ✅ O que foi feito

- Nova jornada, Ajustar marcações e Novo lançamento passaram a usar o botão verde já aprovado.
- Editar e Excluir da lista de jornadas ficaram no tamanho do Visualizar. Excluir fica vermelho só no hover.
- A confirmação de exclusão manteve o mesmo fluxo, com botões neutro e destrutivo no padrão do módulo.
- Os formulários de jornada, ajuste de marcação e lançamento de banco de horas saíram do visual antigo. A ficha do funcionário continua com o formulário anterior.

## 📁 Arquivos criados

- `frontend/src/components/workforce/module-visual.ts`

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EntityScreens.tsx`
- `frontend/src/pages/workforce/JourneyPage.tsx`
- `frontend/src/components/workforce/PunchDay.tsx`
- `frontend/src/components/workforce/TimeResultsPanel.tsx`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A permissão continua sendo `role === "admin"` na jornada e `admin` ou `manager` no lançamento de banco.
- O formulário de correção na ficha do funcionário não mudou. Só a rota `/schedules/adjustments` usa o visual novo.
- Outros catálogos, fora de Jornada e Ponto, continuam com o botão antigo.

## 🐛 Problemas encontrados e soluções

- A checagem de tipos passou. Não havia sessão de administrador no navegador para clicar nos botões.

## 📌 Pendências / próximos passos

- Conferir no navegador, com um administrador, Nova jornada, Editar, Excluir, Ajustar marcações e Novo lançamento.
