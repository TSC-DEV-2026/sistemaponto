# Log — regras de ponto

**Data:** 2026-11-18  
**Sessão:** normas, feriados e motivos na mesma tela

---

## ✅ O que foi feito

- O menu Regras trabalhistas passou a se chamar Regras de ponto, em `/punch-rules`. Motivos saiu do menu lateral.
- A tela ficou com três abas: Normas, Feriados e Motivos.
- Sindicato, convenção ou acordo e regra de ponto viraram uma norma. A ficha guarda nome, sindicato, tipo (convenção ou acordo), vigência e o texto das regras de ponto.
- O funcionário passa a ter vigência de norma, no lugar da vigência de sindicato. Operação em massa e ficha acompanham esse vínculo.
- O motivo é um cadastro só. O tipo (abono, atestado, falta ou ajuste) é escolhido no combo, e a lista pode filtrar por esse tipo.
- A situação ativo/inativo saiu da tela do motivo. Todo motivo fica ativo. A coluna `active` permanece para o dia em que a opção voltar.

## 📁 Arquivos criados

- `backend/alembic/versions/0025_norms.py` — cria `norms`, leva os cadastros antigos e apaga sindicato, convenção e regra de ponto
- `backend/alembic/versions/0026_reasons_active.py` — marca todos os motivos como ativos
- `_logs/2026-11-18_regras-de-ponto.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — tabela `norms` e remoção dos três cadastros
- `backend/app/schemas/workforce.py` — contrato da norma e `norm_label`
- `backend/app/services/workforce_service.py` — vigência, filtro e exclusão
- `backend/app/services/company_defaults.py` — norma padrão da empresa nova
- `backend/app/api/routes/workforce.py` — rotas `/norms`
- `backend/app/core/workforce.py` — tipo de vigência `norm`
- `backend/app/core/resource_catalog.py` — catálogo da API
- `frontend/src/navigation.ts` — menu
- `frontend/src/App.tsx` — rotas e endereços antigos
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas
- `frontend/src/pages/workforce/catalogs.ts` — formulários
- `frontend/src/pages/workforce/EntityScreens.tsx` — lista e ficha
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — aba Norma
- `frontend/src/pages/workforce/EmployeePage.tsx` — ficha
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — alterar norma
- `frontend/src/route-slugs.ts` — slugs e atalhos antigos
- `frontend/src/page-headings.ts` — títulos
- `frontend/src/utils/concept-icons.ts` — ícones
- `frontend/src/utils/labels.ts` — rótulos
- `frontend/src/services/workforce.service.ts` — tipo do funcionário

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A norma guarda o sindicato como texto. Duas normas podem citar o mesmo sindicato.
- A tolerância que a apuração aplica continua na jornada. A norma guarda o texto das regras de ponto.
- Convenção existente cujo nome começa com "conven" vira tipo convenção. As demais viram acordo.
- Se a empresa tinha uma só convenção e uma só regra de ponto, o texto da regra entra na observação da norma. Outras regras de ponto viram normas à parte.
- A vigência antiga de sindicato aponta para a norma mais recente daquele sindicato.
- O slug antigo `union_id` ainda é aceito no serviço como `norm_id`. A rota publicada é `norm_id`.

## 🐛 Problemas encontrados e soluções

- A tela logada não foi percorrida. A verificação ficou nos testes da API e na checagem de tipos do site.

## 📌 Pendências

- Conferir, logado, a aba Normas, um feriado e um motivo novo com o combo de tipo. Conferir a aba Norma na ficha do funcionário.
