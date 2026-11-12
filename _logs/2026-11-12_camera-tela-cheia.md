# Log — câmera em tela cheia

**Data:** 2026-11-12  
**Sessão:** ajuste visual

---

## ✅ O que foi feito

- O ícone de trocar a câmera ficou no centro da parte de baixo da tela.
- A câmera do rosto, a da selfie e a do QR Code passam a ocupar a tela inteira, no aplicativo do funcionário e no aparelho compartilhado.
- O quadrado do QR Code continua no centro. A leitura segue só dentro dele, depois de 1 segundo.
- No aplicativo do funcionário, a câmera do rosto e a do QR Code abrem por cima do menu de baixo.
- A instrução do QR Code fica escrita sobre a câmera, no mesmo bloco escuro do reconhecimento facial.
- No aparelho compartilhado, o botão Voltar do QR Code fica no canto superior esquerdo.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `mobile/lib/features/app/presentation/screens/face_camera_screen.dart` — preview cobre a tela e o ícone desce
- `mobile/lib/features/app/presentation/screens/selfie_camera_screen.dart` — preview cobre a tela e o ícone desce
- `mobile/lib/app/router.dart` — navegador raiz para a câmera cobrir o menu
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — rosto e QR Code abrem por cima do menu
- `mobile/lib/features/app/presentation/screens/qr_punch_screen.dart` — câmera inteira, com a instrução sobre a imagem
- `mobile/lib/features/app/presentation/widgets/qr_fit_scanner.dart` — remove a faixa de 360 px e desce o ícone
- `mobile2/lib/features/device/presentation/screens/face_camera_screen.dart` — preview cobre a tela e o ícone desce
- `mobile2/lib/features/device/presentation/screens/selfie_camera_screen.dart` — preview cobre a tela e o ícone desce
- `mobile2/lib/features/device/presentation/screens/qr_punch_screen.dart` — Voltar no canto superior esquerdo
- `mobile2/lib/features/device/presentation/widgets/qr_fit_scanner.dart` — remove a faixa de 360 px e desce o ícone

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Enquanto o QR Code não foi lido, a tela é só a câmera. A instrução fica no bloco escuro, como no rosto. Depois da leitura, volta o formulário da selfie.
- A câmera do funcionário sobe no navegador raiz. Assim o menu de baixo fica atrás dela.
- O botão de tirar a selfie fica acima do ícone, para os dois não se cobrirem.

## 🐛 Problemas encontrados e soluções

- O leitor do QR Code abria numa faixa de 360 px. → A câmera passou a preencher a tela.
- O ícone ficava no centro. → Passou para o centro da parte de baixo.

## 📌 Pendências / próximos passos

- Commit e push ainda não foram pedidos.
