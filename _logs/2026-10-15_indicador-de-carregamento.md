# Log — indicador de carregamento

**Data:** 2026-10-15  
**Sessão:** ponto 13 do plano, site e aplicativo

---

## ✅ O que foi feito

- A espera de uma ação mostra um indicador circular no centro da tela, com o texto "Carregando"
- A barra de progresso do topo saiu do site e do aplicativo
- O indicador liga ao enviar o formulário e desliga quando a resposta chega, no sucesso e no erro
- No login, Entrar liga o indicador até a sessão abrir ou a mensagem de erro aparecer

## 📁 Arquivos criados

- `frontend/src/utils/action-loader.ts` — decide que envio de formulário espera, e leitura de tela não
- `mobile/test/loader_test.dart` — o círculo fica no centro e a barra não aparece

## ✏️ Arquivos modificados

- `frontend/src/components/GlobalLoader.tsx` — indicador circular no centro, no lugar da barra
- `frontend/src/services/api.ts` — liga o indicador só no envio do formulário
- `frontend/src/App.tsx` — tira a barra que piscava a cada troca de tela
- `frontend/src/pages/LoginPage.tsx` — remove o import de input que o typecheck acusou
- `mobile/lib/shared/widgets/global_loader.dart` — indicador circular no centro, no lugar da barra

## 🗑️ Arquivos removidos

- `frontend/src/components/RouteLoader.tsx` — era a barra de progresso da troca de tela

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- No site, abrir uma lista não cobre a tela. O indicador aparece no post, put, patch e delete, que são os envios de formulário
- No aplicativo, as esperas que já ligavam a barra passam a mostrar o círculo. O login já ligava essa espera até a resposta

## 🐛 Problemas encontrados e soluções

- O typecheck falhou porque o login importava o input sem usar → o import foi removido
- O Flutter não está instalado nesta máquina, então o teste do aplicativo não rodou aqui. O teste do backend passou

## 📌 Pendências / próximos passos

- —
