# Log — visual de permissões e acessos

**Data:** 2026-11-06  
**Sessão:** redesign da área de conteúdo de Permissões e Acessos

---

## ✅ O que foi feito

- A listagem passou ao card de pesquisa e à lista da estrutura organizacional, com papel acima do campo e paginação.
- Vincular pessoa e o detalhe do acesso ocupam a largura do conteúdo, com Voltar à esquerda.
- O papel usa a lista fixa. Enquanto carrega, a ficha mostra o spinner.
- Excluir pede confirmação na própria tela.
- O menu, o atalho das configurações e as rotas da lista, do vínculo e do detalhe ficam só com o administrador. Gestor e membro voltam para o início.

## 📁 Arquivos criados

- `_logs/2026-11-06_permissoes.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/MembershipsPage.tsx` — listagem.
- `frontend/src/pages/MembershipFormPage.tsx` — novo vínculo.
- `frontend/src/pages/MembershipDetailPage.tsx` — papel e exclusão.
- `frontend/src/utils/labels.ts` — nomes dos papéis.
- `frontend/src/navigation.ts` — item só para o administrador.
- `frontend/src/pages/SettingsPage.tsx` — atalho só para o administrador.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Não houve busca por nome porque a API lista por papel e por pessoa, não por texto.
- A frase de quem entra no sistema ficou no subtítulo do card, sem faixa explicativa.

## 🧪 Como testar

1. Abrir Permissões e Acessos, filtrar o papel e paginar.
2. Vincular uma pessoa e conferir nome, CPF, e-mail e papel.
3. Abrir um acesso, trocar o papel e salvar.
4. Excluir só depois da confirmação.
5. Entrar como gestor ou membro e conferir que o menu não mostra Permissões e Acessos. Abrir `/memberships`, `/memberships/new` ou `/memberships/1` volta para o início.

## ❗ Problemas encontrados

- O navegador isolado não entra no sistema local. A conferência visual logada ficou com quem usa a tela.
