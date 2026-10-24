# Log — operações em massa

**Data:** 2026-10-24  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- O administrador ganhou Operações em massa no menu. A tela muda cargo, jornada, centro de custo, equipe, situação, gestor, sindicato ou tipo de registro de várias pessoas.
- Os filtros se combinam: cargo, centro de custo, jornada, equipe, setor, unidade, sindicato, gestor e situação. Marcar todos vale para o filtro inteiro.
- Se uma pessoa da seleção falhar, nenhuma daquele lote é salva e a mensagem diz quem e por quê.
- A ficha e a operação em massa salvam o reconhecimento facial sem foto. A batida sem foto responde "Este funcionário não tem foto de referência."
- O aplicativo não mudou. Ele já mostra a mensagem que a API devolve.

## 📁 Arquivos criados

- `frontend/src/pages/workforce/BulkChangesPage.tsx` — tela da operação em massa
- `_logs/2026-10-24_operacoes-em-massa.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — lote, filtros da lista e facial sem foto obrigatória
- `backend/app/repositories/workforce_repository.py` — quem está em cada vigência hoje
- `backend/app/schemas/workforce.py` — corpo da alteração em massa
- `backend/app/api/routes/workforce.py` — rota do lote e filtros da lista
- `backend/tests/test_workforce_service.py` — lote, filtro e batida sem foto
- `frontend/src/navigation.ts` — item do menu só para o administrador
- `frontend/src/components/layouts/AppShell.tsx` — esconde o item de quem não é administrador
- `frontend/src/App.tsx` — rota da tela
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — a foto de referência deixou de ser obrigatória

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O tipo de registro não pede data. Os outros vínculos pedem vigência, como na ficha.
- A equipe do lote grava setor e unidade na mesma data.
- A lista continua paginada. Marcar todos percorre as páginas do filtro.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
