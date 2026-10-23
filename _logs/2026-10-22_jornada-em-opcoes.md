# Log — jornada e ponto em opções

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Jornada e Ponto passou a ter uma opção para Jornadas, Marcações, Apuração e Banco de horas.
- Cada opção abre na lista. Nova jornada, editar jornada, ajustar marcações e novo lançamento abrem em tela própria.
- A ficha do funcionário continua com a apuração, o banco e o ajuste daquela pessoa.

## 📁 Arquivos criados

- `_logs/2026-10-22_jornada-em-opcoes.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/JourneyPage.tsx` — opções e os formulários de ajuste e de lançamento
- `frontend/src/pages/workforce/catalogs.ts` — jornada no mesmo cadastro de lista e formulário
- `frontend/src/pages/workforce/EntityScreens.tsx` — horário da jornada na lista
- `frontend/src/App.tsx` — rotas dos formulários
- `frontend/src/components/workforce/CatalogPanel.tsx` — o formulário deixou de ficar na lista
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — a apuração entra na opção sem repetir o título

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O botão da escala é Nova jornada.
- Ajustar marcações continua só com o administrador. Novo lançamento continua com administrador e gestor.
- Apuração não tem cadastro novo. A consulta do período fica na própria opção.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- As telas não foram clicadas no navegador. A checagem foi o TypeScript.
