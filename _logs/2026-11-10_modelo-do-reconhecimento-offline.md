# Log — modelo do reconhecimento offline

**Data:** 2026-11-10  
**Sessão:** incluir o modelo local no app

---

## ✅ O que foi feito

- O `w600k_r50.onnx` colocado em `mobile/assets/models/` passou a ser asset do aplicativo.
- O arquivo continua fora do Git.

## 📁 Arquivos criados

- `_logs/2026-11-10_modelo-do-reconhecimento-offline.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `mobile/pubspec.yaml` — declara `assets/models/w600k_r50.onnx`.
- `mobile/.gitignore` — o modelo não entra no repositório.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O modelo fica na máquina de quem gera o APK. O repositório não versiona os 166 MB.
- O APK já instalado não passa a enxergar o arquivo. É preciso gerar o debug de novo.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Gerar de novo o APK de debug e instalar no aparelho.
