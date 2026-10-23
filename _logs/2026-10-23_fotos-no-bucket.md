# Log — fotos no bucket

**Data:** 2026-10-23  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A marcação aceita passa a gravar a selfie, a foto do QR e a captura do rosto no bucket `sistemaponto`. O caminho nasce na hora: `marcacoes/ano-mês-dia/arquivo`.
- A foto de referência do reconhecimento facial vai para `referencias/` e a ficha guarda o caminho. O embedding continua no banco.
- A lista de Marcações e a ficha abrem a imagem por um link temporário.
- As fotos que já estavam em `bytea` foram copiadas para o bucket e o binário foi esvaziado.

## 📁 Arquivos criados

- `backend/alembic/versions/0012_photo_keys.py` — colunas do caminho na marcação e na ficha
- `backend/app/services/punch_photo_archive.py` — cópia única das fotos que já estavam no banco
- `_logs/2026-10-23_fotos-no-bucket.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/services/storage_service.py` — grava marcação e referência no caminho do processo
- `backend/app/services/workforce_service.py` — sobe a foto depois que o ponto é aceito e devolve o link
- `backend/app/core/images.py` — reconhece JPEG e PNG para o arquivo
- `backend/app/models/workforce.py` — caminho da foto na marcação e na ficha
- `backend/app/schemas/workforce.py` — caminho e link na resposta
- `backend/tests/test_workforce_service.py` — o teste guarda o arquivo em memória
- `frontend/src/services/workforce.service.ts` — tipos do caminho e do link
- `frontend/src/components/workforce/PunchDay.tsx` — links da selfie, do QR e do rosto
- `frontend/src/components/workforce/TimeOffFields.tsx` — o link aceita um texto
- `frontend/src/pages/workforce/EmployeePage.tsx` — link da foto de referência na ficha
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — link da foto já gravada no formulário

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A pasta do dia usa a data da marcação em `America/Sao_Paulo`. Um ponto do dia 23 que sobe no dia 24 fica na pasta do dia 23.
- O bucket no `.env` é `R2_BUCKET=sistemaponto`, que é o nome lido pela API.
- As credenciais ficam só no `.env` local. Esse arquivo não entra no commit.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Reiniciar a API para ela passar a gravar e a devolver os links.
- A tela não foi clicada no navegador. A checagem foi o TypeScript, os testes do serviço e a cópia das fotos que já estavam no banco.
