# Log — encaixe do QR Code

**Data:** 2026-11-12  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- O QR Code do aplicativo do funcionário e do aparelho compartilhado só é lido quando o código inteiro está dentro do quadrado.
- Depois do encaixe, a leitura espera 1 segundo. A tela não mostra contador.
- A câmera mostra o quadrado escurecendo o que fica fora dele.

## 📁 Arquivos criados

- `mobile/lib/features/app/presentation/widgets/qr_fit_scanner.dart` — encaixe da câmera do funcionário
- `mobile2/lib/features/device/presentation/widgets/qr_fit_scanner.dart` — encaixe da câmera do aparelho

## ✏️ Arquivos modificados

- `mobile/lib/features/app/presentation/screens/qr_punch_screen.dart` — usa o encaixe
- `mobile2/lib/features/device/presentation/screens/qr_punch_screen.dart` — usa o encaixe

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O quadrado fica no centro e ocupa cerca de 62% do lado menor da câmera. Um código na borda da imagem não entra.
- A selfie continua depois da leitura, como já era.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Gerar de novo os APKs de depuração dos dois aplicativos.
- Commit e push ainda não foram feitos.
