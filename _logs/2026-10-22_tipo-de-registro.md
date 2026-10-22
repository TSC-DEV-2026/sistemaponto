# Log — tipo de registro da marcação

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Cada funcionário ganhou um tipo de registro: `simple`, `qr` ou `face`. Quem já existe fica em `simple`.
- A marcação do próprio funcionário só entra quando a origem combina com o tipo. Correção manual, pedido aprovado, administrador e AFD continuam fora dessa trava.
- O QR exige a foto do código e a selfie. O texto lido precisa ser o da unidade, do CPF e da matrícula da sessão. A selfie fica só como evidência.
- O rosto exige foto de referência. O servidor gera o embedding (`buffalo_l` / `w600k_r50`) e só grava a marcação quando a comparação é deste funcionário, acima do limiar 0,40 e com margem 0,05. Online e offline passam pela mesma confirmação. O evento do aparelho evita marcação duplicada no offline.
- A API lista os embeddings dos funcionários com tipo `face` para o aparelho baixar.

## 📁 Arquivos criados

- `backend/alembic/versions/0011_clock_method.py` — tipo no funcionário, fotos da marcação, evento do aparelho e tabela de embeddings
- `backend/app/core/images.py` — decodifica a foto enviada em base64 antes de gravar
- `backend/app/core/face_match.py` — comparação por cosseno, limiar e margem
- `backend/app/services/face_embedder.py` — extração do embedding com InsightFace, carregada só quando a foto chega
- `backend/tests/test_face_match.py` — aceita o mesmo rosto, recusa outro e recusa dois rostos parecidos
- `_logs/2026-10-22_tipo-de-registro.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — `clock_method`, fotos da marcação, `client_event_id` e `FaceEmbedding`
- `backend/app/schemas/workforce.py` — tipo no cadastro, fotos do QR e do rosto, saída dos embeddings
- `backend/app/services/workforce_service.py` — trava do tipo, gravação da referência, comparação e lista para o aparelho
- `backend/app/api/routes/workforce.py` — `GET /face-embeddings` e os corpos novos de QR e rosto
- `backend/app/core/resource_catalog.py` — coleção `face-embeddings`
- `backend/requirements.txt` — numpy, opencv, insightface e onnxruntime
- `backend/tests/test_workforce_service.py` — QR, rosto e tipo de registro
- `backend/tests/test_resource_catalog.py` — nome da coleção nova

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- `numpy` — vetor do embedding
- `opencv-python-headless` — lê a foto antes do InsightFace
- `insightface` — modelo `buffalo_l` / `w600k_r50`
- `onnxruntime` — execução do modelo no servidor

## ⚠️ Decisões tomadas

- A foto da marcação fica em `bytea` até existir armazenamento de objeto. O plano deste ponto pediu o binário na marcação porque é mais leve que o base64. O embedding fica em JSON de 512 números, não na foto.
- A comparação é cosseno dos vetores. A selfie do QR não identifica a pessoa.
- Sem embedding de referência, a marcação facial não entra. O aparelho não decide no lugar do servidor.
- O teste unitário injeta um embedder falso. O modelo real só carrega na marcação ou no cadastro facial.

## 🐛 Problemas encontrados e soluções

- O teste antigo fazia simples, QR e rosto no mesmo funcionário → o teste troca o tipo antes de cada modo
- `test_listas_aceitam_os_campos_de_busca` continua falhando porque as rotas incluídas não aparecem em `app.routes`. Já falhava antes deste ponto

## 📌 Pendências / próximos passos

- Frontend e mobile do Ponto 2: campo do tipo no cadastro, câmera do QR, desafio de piscar e fila offline
- Rodar `alembic upgrade head` no banco desta API antes de usar o tipo novo
- Instalar as dependências novas no venv antes da primeira foto facial real
