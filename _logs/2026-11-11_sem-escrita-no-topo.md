# Log — sem escrita no topo

**Data:** 2026-11-11  
**Sessão:** correção de bug

---

## ✅ O que foi feito

- A escrita sistemapontorep com fundo preto saiu do topo das telas do aparelho.
- O nome do aplicativo no celular continua sistemapontorep.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `mobile2/lib/features/device/presentation/screens/home_screen.dart` — topo começa em Registrar ponto
- `mobile2/lib/features/device/presentation/screens/setup_screen.dart` — topo começa em Liberar aparelho
- `mobile2/lib/core/theme/app_theme.dart` — saiu a cor que só a escrita usava

## 🗑️ Arquivos removidos

- `mobile2/lib/shared/widgets/brand_wordmark.dart` — a escrita do topo

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O nome exibido na lista de aplicativos do celular permanece.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Gerar de novo o APK de depuração para ver a tela sem a escrita.
