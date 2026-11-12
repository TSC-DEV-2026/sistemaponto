# Log — nome sistemapontorep

**Data:** 2026-11-11  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- O nome do aplicativo no celular passou de Ponto relógio para sistemapontorep.
- Dentro do app, a escrita fica junta: sistema em branco, ponto em verde e rep em amarelo.

## 📁 Arquivos criados

- `mobile2/lib/shared/widgets/brand_wordmark.dart` — a escrita colorida numa linha só

## ✏️ Arquivos modificados

- `mobile2/android/app/src/main/AndroidManifest.xml` — nome exibido no Android
- `mobile2/ios/Runner/Info.plist` — nome exibido no iOS
- `mobile2/lib/app/app.dart` — título do aplicativo
- `mobile2/lib/core/theme/app_theme.dart` — amarelo do trecho rep
- `mobile2/lib/features/device/presentation/screens/home_screen.dart` — usa a escrita nova
- `mobile2/lib/features/device/presentation/screens/setup_screen.dart` — usa a escrita nova

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O fundo da escrita é preto para o branco e o amarelo aparecerem. A palavra não leva espaço nem quebra.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Gerar de novo o APK de depuração para o celular mostrar o nome novo.
