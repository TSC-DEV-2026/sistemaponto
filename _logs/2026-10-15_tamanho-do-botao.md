# Log — tamanho do botão

**Data:** 2026-10-15  
**Sessão:** correção do spinner do ponto 13

---

## ✅ O que foi feito

- O botão mantém a largura e a altura quando o texto vira spinner
- O texto continua ocupando o espaço, só fica invisível, e o spinner fica no centro
- Vale para o Reenviar de Configurações e para os outros botões de ação, no site e no aplicativo

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/components/ui/button.tsx` — o texto invisível segura o tamanho
- `mobile/lib/shared/widgets/busy_button.dart` — o rótulo continua ocupando o espaço
- `mobile/test/busy_button_test.dart` — o tamanho do botão não muda durante a espera

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O botão não usa o estado desabilitado só por estar esperando, para não encolher nem esmaecer. O clique fica bloqueado do mesmo jeito

## 🐛 Problemas encontrados e soluções

- Trocar o texto pelo spinner diminuía o botão, como o Reenviar em Configurações → o texto fica invisível e o spinner fica na mesma célula
- A animação de giro anulava o deslocamento que centralizava o spinner, e o botão parecia sair do lugar → o spinner não usa mais esse deslocamento

## 📌 Pendências / próximos passos

- —
