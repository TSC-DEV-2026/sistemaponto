# Log — vários gestores

**Data:** 2026-11-15  
**Sessão:** passo 7 dos gestores do funcionário

---

## ✅ O que foi feito

- A main ficou no filtro de relatório, commit eac7b4b.
- Um funcionário pode ter um ou vários gestores vigentes ao mesmo tempo.
- Incluir outro gestor não encerra os que já valem. Encerrar um deixa os demais e o registro fica no histórico.
- O filtro por gestor encontra o funcionário por qualquer gestor vigente.
- A operação em massa inclui o gestor escolhido e mantém os outros.
- Quem está vigente como gestor, e tem o papel de gestor, enxerga e pode decidir por esse funcionário, além da própria equipe. Continua sem decidir a própria solicitação.
- Função, jornada, equipe e os demais vínculos seguem com uma vigência aberta por vez.

## 📁 Arquivos criados

- `_logs/2026-11-15_varios-gestores.md` — este log

## ✏️ Arquivos modificados

- `backend/app/repositories/workforce_repository.py` — vários gestores abertos e o filtro por qualquer um deles
- `backend/app/services/workforce_service.py` — inclusão, encerramento, ficha, filtro e quem enxerga o funcionário
- `backend/app/schemas/workforce.py` — lista de gestores e o encerramento
- `backend/tests/test_workforce_service.py` — dois gestores, filtro, visão e período fechado
- `frontend/src/services/workforce.service.ts` — lista de gestores na ficha
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — lista com rolagem, adicionar e encerrar
- `frontend/src/pages/workforce/EmployeePage.tsx` — gestores na aba Trabalho
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — a operação inclui o gestor
- `cursor_instructions_ponto/00-CURSOR-MASTER-INSTRUCTIONS.md` — quem aprova
- `cursor_instructions_ponto/02-WEB-ADMIN-SCOPE.md` — ficha e aprovação
- `cursor_instructions_ponto/03-MOBILE-APP-SCOPE.md` — a mesma regra de aprovação, sem mudança no aplicativo
- `cursor_instructions_ponto/04-BUSINESS-RULES-AND-WORKFLOWS.md` — quem decide e quem vê o documento
- `cursor_instructions_ponto/07-HISTORY-VIGENCY-AND-AUDIT.md` — mais de uma vigência aberta só para gestor

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A pessoa não pode ser gestora de si mesma.
- Incluir de novo o mesmo gestor, enquanto ele vale, é recusado. No mesmo dia, a observação pode ser atualizada.
- Encerrar vale a partir de hoje. Se o dia de hoje está em período fechado, o encerramento é recusado.
- O papel de funcionário não passa a enxergar outras pessoas só porque o nome está como gestor.
- A aba da edição se chama Gestores e fica entre Equipe e Sindicato. A frase sobre incluir outro saiu da tela.
- Os títulos das abas de edição passaram de Alterar para Nova função, Nova jornada, Novo grupo, Nova equipe e Novo sindicato. Situação continua Alterar situação. Gestores continua Adicionar gestor.
- O aplicativo do funcionário e o relógio não entram neste passo.

## 🐛 Problemas encontrados e soluções

- A tela não foi conferida no navegador. O site em localhost:5175 não estava no ar.

## 📌 Pendências / próximos passos

- Commit e push quando for pedido.
