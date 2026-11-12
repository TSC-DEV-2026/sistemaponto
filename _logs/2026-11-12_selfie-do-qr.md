# Log — selfie do QR Code

**Data:** 2026-11-12  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- A câmera do QR Code é solta antes da selfie, no aplicativo do funcionário e no aparelho compartilhado.
- A selfie abre a câmera da frente.
- No reconhecimento facial, na leitura do QR Code e na selfie há o botão Trocar câmera. O padrão de abertura continua o de hoje.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `mobile/lib/features/app/presentation/screens/qr_punch_screen.dart` — solta a câmera e abre a da frente
- `mobile2/lib/features/device/presentation/screens/qr_punch_screen.dart` — solta a câmera e abre a da frente

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A mensagem "A selfie não foi aceita" nessa etapa vinha da câmera ainda presa ao leitor do QR Code, não da foto em si.

## 🐛 Problemas encontrados e soluções

- A selfie falhava logo depois do QR Code. → O leitor para e só então a câmera da frente abre.

## 📌 Pendências / próximos passos

- Gerar de novo os APKs de depuração.
- Commit e push ainda não foram feitos.
