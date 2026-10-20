# Log — listagem e cadastro

**Data:** 2026-10-19  
**Sessão:** ponto 16 do plano, só o site

---

## ✅ O que foi feito

- Cada entidade do ponto 16 ficou numa aba só com a lista. O botão Novo fica na mesma linha das abas, no canto direito. Ao lado do campo fica o botão Pesquisar
- A mesma paginação e a pesquisa pelos filtros da API entraram nas outras listas: jornada, marcação, vigência, ocorrência, solicitação, fechamento, aviso, e-mail, auditoria, arquivo fiscal, banco de horas, assinatura e cobrança. No aplicativo, solicitações e avisos também paginam
- A pesquisa filtra enquanto se digita e também ao clicar em Pesquisar. Em funcionário, texto com letra busca o nome e texto só com número busca o CPF. A busca volta para a página 1
- A lista começa com 20 registros. O rodapé deixa escolher 5, 10 ou 20 e mostra "Página X de Y (N itens)"
- A paginação segue o componente do shadcn: Anterior, o número da página atual, as páginas vizinhas e Próxima. A página atual fica marcada. Muitas páginas mostram reticências
- Cada linha tem olho, lápis e lixeira. O olho abre a ficha somente leitura. O lápis abre o formulário preenchido. A lixeira pede confirmação antes de excluir
- O formulário é outra tela, com os campos, Salvar e Voltar. Voltar cai na aba da entidade
- Novo, Voltar, Salvar, Consultar e Gerar no site levam ícone junto do texto

## 📁 Arquivos criados

- `frontend/src/pages/workforce/catalogs.ts` — campos e volta de cada entidade
- `frontend/src/pages/workforce/EntityScreens.tsx` — aba, lista e formulário
- `frontend/src/components/ui/pagination.tsx` — paginação no modelo do shadcn
- `frontend/src/components/workforce/list-controls.tsx` — pesquisa, filtros e paginação reutilizados nas listas

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — rotas de ver, editar e criar
- `frontend/src/pages/workforce/PeoplePage.tsx` — abas de pessoas
- `frontend/src/pages/workforce/OperationsPages.tsx` — estrutura, regras trabalhistas, motivos e ícones de Consultar e Gerar
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — novo e editar funcionário
- `frontend/src/pages/workforce/EmployeePage.tsx` — ficha do cadastro somente leitura
- `frontend/src/components/ui/button.tsx` — tamanho do botão de ícone usado na página
- `frontend/src/components/workforce/CatalogPanel.tsx` — ícone em Salvar, usado pela jornada
- `frontend/src/pages/MembershipFormPage.tsx` — ícone em Salvar
- `frontend/src/pages/MembershipDetailPage.tsx` — ícone em Salvar
- `frontend/src/pages/TenantDetailPage.tsx` — ícone em Salvar
- `frontend/src/pages/ChangePasswordPage.tsx` — ícone em Salvar
- `frontend/src/pages/ResetPasswordPage.tsx` — ícone em Salvar

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O aplicativo não mudou. Essas listas são do site, e a regra do ícone também
- Jornada continua na tela Jornada e Ponto. Ela não está no ponto 16
- Na ficha do funcionário, os dados do cadastro ficaram só leitura. Vigência, ocorrência e ponto continuam nessa ficha
- Quem não é administrador vê a lista e o olho. Novo, lápis e lixeira ficam com o administrador
- Ainda sem commit, para teste

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e push ficam para depois do teste
