# Log — ícone de trocar a câmera

**Data:** 2026-11-12  
**Sessão:** ajuste visual

---

## ✅ O que foi feito

- O controle de trocar a câmera ficou só com o ícone de setas invertidas, maior, sem texto, no centro da câmera.
- Vale para o reconhecimento facial, a leitura do QR Code e a selfie, no aplicativo do funcionário e no aparelho compartilhado.
- O padrão de abertura continua o de hoje: rosto e selfie na frente, leitor do QR Code atrás.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `mobile/lib/features/app/presentation/screens/face_camera_screen.dart` — ícone central no lugar do botão com texto
- `mobile/lib/features/app/presentation/screens/selfie_camera_screen.dart` — ícone central no lugar do botão com texto
- `mobile/lib/features/app/presentation/widgets/qr_fit_scanner.dart` — ícone central no lugar do botão no canto
- `mobile2/lib/features/device/presentation/screens/face_camera_screen.dart` — ícone central no lugar do botão com texto
- `mobile2/lib/features/device/presentation/screens/selfie_camera_screen.dart` — ícone central no lugar do botão com texto
- `mobile2/lib/features/device/presentation/widgets/qr_fit_scanner.dart` — ícone central no lugar do botão no canto

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O ícone é o de setas opostas (`arrowDownUp`), no tamanho 64, com a dica "Trocar câmera" só ao manter pressionado.
- No leitor do QR Code o ícone ocupa o centro da área da câmera, para os dois aplicativos ficarem no mesmo ponto.

## 🐛 Problemas encontrados e soluções

- No aparelho compartilhado o botão antigo ficava no canto ou à esquerda. → O ícone passou a ser centralizado da mesma forma nos dois aplicativos.

## 📌 Pendências / próximos passos

- —
