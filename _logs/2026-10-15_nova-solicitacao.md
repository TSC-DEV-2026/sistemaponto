# Log — nova solicitação

**Data:** 2026-10-15  
**Sessão:** ponto 14 do plano, site e aplicativo

---

## ✅ O que foi feito

- A tela Solicitações ficou só com a lista
- O botão "Nova solicitação" aparece para quem está logado e tem funcionário ligado ao próprio acesso, e esse funcionário não está desligado
- O botão abre outra tela, com ajuste, abono, atestado, afastamento e férias
- Gestor e administrador sem funcionário ligado veem só a lista
- Gestor e administrador que também batem ponto veem a lista e o botão

## 📁 Arquivos criados

- `frontend/src/pages/workforce/RequestFormPage.tsx` — formulário de nova solicitação no site
- `mobile/lib/features/app/presentation/screens/new_request_screen.dart` — o mesmo formulário no aplicativo

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — a lista não tem mais o formulário
- `frontend/src/App.tsx` — rota `/requests/new`
- `mobile/lib/features/app/presentation/screens/requests_screen.dart` — lista e o botão
- `mobile/lib/app/router.dart` — rota `/requests/new`

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Quem não bate ponto é quem não tem funcionário ligado ou está desligado. Esse caso não vê o botão
- A volta dessa tela fica para o ponto 15. No site, Solicitações no menu volta para a lista. No aplicativo, o item Solicitações da barra de baixo faz o mesmo

## 🐛 Problemas encontrados e soluções

- O typecheck acusou o import das marcações e um estado do arquivo que a lista não usava mais → os dois foram removidos
- O Flutter não está instalado nesta máquina, então o aplicativo não foi executado aqui. O typecheck do site passou e o teste do backend passou

## 📌 Pendências / próximos passos

- —
