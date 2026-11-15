# Log — filtro de lugar no relatório

**Data:** 2026-11-15  
**Sessão:** passo 6 dos filtros de relatório

---

## ✅ O que foi feito

- O relatório filtra por uma ou várias empresas, setores e equipes, além do funcionário. A escolha abre num combo com pesquisa e checkbox.
- Cada linha usa a vigência que vale na data dela.
- Empresa, setor e equipe se somam: a pessoa precisa estar em todos os filtros marcados naquele dia.

## 📁 Arquivos criados

- `_logs/2026-11-15_filtro-de-lugar-no-relatorio.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — filtro pela vigência do dia
- `backend/app/api/routes/workforce.py` — vários ids de empresa, setor e equipe
- `backend/tests/test_workforce_service.py` — troca de equipe no meio do período
- `frontend/src/components/workforce/place-combobox.tsx` — combo com pesquisa e checkbox
- `frontend/src/pages/workforce/OperationsPages.tsx` — empresa, setor e equipe no formato do funcionário
- `cursor_instructions_ponto/02-WEB-ADMIN-SCOPE.md` — regra do filtro

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Empresa, setor e equipe abrem num combo com pesquisa. O checkbox marca um ou vários.
- Dentro do mesmo filtro, vários valores se alternam. Entre empresa, setor e equipe, os filtros se somam.
- Uma linha sem funcionário, como o fechamento, fica de fora quando algum desses filtros está marcado.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- O passo de vários gestores ainda não foi feito.
