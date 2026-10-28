# Log — aba Jornadas

**Data:** 2026-10-28  
**Sessão:** acabamento visual da aba Jornadas

---

## ✅ O que foi feito

- A aba Jornadas passou a usar card branco, pesquisa com ícone e botão verde, e cada jornada em um card horizontal
- O texto introdutório e as quatro abas ficaram no visual do módulo, sem repetir o título do cabeçalho
- A paginação de 5, 10 e 20 ficou no rodapé da listagem, com a opção ativa em verde
- Pesquisa, visualização, permissões de administrador e as outras abas continuam com a mesma lógica

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/JourneyPage.tsx` — aplica o visual só neste módulo
- `frontend/src/pages/workforce/EntityScreens.tsx` — abas do módulo e card da jornada
- `frontend/src/components/workforce/list-controls.tsx` — paginação compacta quando o tom é do módulo
- `frontend/src/components/ui/list-placeholder.tsx` — permite classe no estado vazio e no carregamento

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O título "Jornada e Ponto" não foi repetido na página, porque o cabeçalho já mostra
- Editar, excluir e Nova jornada continuam só para administrador, fora do clique do card, para não criar link dentro de link
- As outras abas e os outros cadastros não usam esse visual

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
