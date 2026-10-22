# Log — tipo de registro no site e no app

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- O formulário de funcionário pede o tipo de registro na criação e na edição. Reconhecimento facial pede a foto de referência. A lista e a ficha mostram o tipo.
- A tela de registro de ponto do site mostra o botão simples só para quem usa esse tipo. QR e rosto ficam no aplicativo. O administrador continua registrando a marcação de outra pessoa.
- A home do app mostra só o fluxo do tipo gravado.
- QR: a câmera lê o código e guarda a foto. A selfie vem em seguida. Os dois sobem em base64. Leitura errada não grava e permite outra tentativa.
- Rosto: o desafio pede fechar os dois olhos e reabrir. Online, a foto sobe e o servidor decide. Offline, o aparelho compara com os embeddings baixados e só guarda a marcação se o match for o funcionário da sessão. O envio posterior usa o id do evento para não duplicar.

## 📁 Arquivos criados

- `mobile/lib/face/face_constants.dart` — limiar, margem e modelo buffalo_l
- `mobile/lib/face/blink_challenge.dart` — desafio de piscar
- `mobile/lib/face/camera_input_image.dart` — quadro da câmera para o detector
- `mobile/lib/face/mlkit_face_detector.dart` — maior rosto e pontos do ArcFace
- `mobile/lib/face/arcface_alignment.dart` — recorte 112 alinhado
- `mobile/lib/face/onnx_embedder.dart` — embedding local w600k_r50
- `mobile/lib/face/face_pipeline.dart` — foto local até o vetor
- `mobile/lib/face/cosine_match.dart` — comparação do vetor com o cadastro da empresa
- `mobile/lib/features/app/data/clock_store.dart` — SQLite dos embeddings e da fila offline
- `mobile/lib/features/app/data/clock_flow.dart` — envio do QR, do rosto e da fila
- `mobile/lib/features/app/presentation/screens/qr_punch_screen.dart` — leitura do QR e selfie
- `mobile/lib/features/app/presentation/screens/face_camera_screen.dart` — câmera do desafio
- `mobile/test/clock_match_test.dart` — piscar, cosseno e margem
- `_logs/2026-10-22_tipo-de-registro-no-app.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — tipo e foto de referência
- `frontend/src/pages/workforce/EmployeePage.tsx` — tipo na ficha
- `frontend/src/pages/workforce/EntityScreens.tsx` — tipo na lista
- `frontend/src/pages/workforce/OperationsPages.tsx` — registro do site segue o tipo
- `frontend/src/services/workforce.service.ts` — campo `clock_method`
- `frontend/src/utils/labels.ts` — rótulos do tipo
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — um fluxo por funcionário
- `mobile/pubspec.yaml` — câmera, leitor de QR, detector, SQLite e ONNX
- `mobile/pubspec.lock` — versões resolvidas

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- `camera`, `google_mlkit_face_detection` — desafio de piscar
- `mobile_scanner` — leitura do QR
- `sqflite`, `path`, `path_provider` — embeddings e fila no aparelho
- `image`, `onnxruntime` — embedding local no offline
- `uuid` — id do evento para não duplicar a marcação

## ⚠️ Decisões tomadas

- QR e rosto do próprio funcionário ficam no aplicativo. O site guarda o tipo e a foto de referência.
- Online, a marcação facial não fica no aparelho se o servidor recusar. Offline só entra na fila depois do match local.
- O arquivo `w600k_r50.onnx` não vai no repositório. Sem ele, o offline facial avisa que o reconhecimento local está indisponível e não grava. O online continua no servidor.

## 🐛 Problemas encontrados e soluções

- O método da selfie tinha o mesmo nome do arquivo escolhido → o botão foi separado da foto
- O cliente da API da tela de QR não enxergava o provider → a tela importa o provider de autenticação

## 📌 Pendências / próximos passos

- Para o APK usar reconhecimento offline, copiar `w600k_r50.onnx` para `mobile/assets/models/` e declarar o arquivo em `pubspec.yaml` antes do `flutter build apk`
- O `.env` do app precisa de um `API_URL` que o celular alcance
