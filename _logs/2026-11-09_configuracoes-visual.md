# Log — visual das configurações

**Data:** 2026-11-09  
**Sessão:** ajuste visual da área de configurações

---

## ✅ O que foi feito

- Ajustou a parte de configurações: conta, verificação de e-mail, senha, empresas e notificações no padrão das outras telas.
- A troca de senha ficou numa tela própria, aberta por Segurança.
- Empresas ganhou lista com visualizar, editar e excluir, cadastro em tela separada e máscara de CNPJ.
- Notificações passou a usar abas. O sininho do topo mostra quantos avisos ainda não foram lidos.
- A pesquisa de empresas e a contagem do sininho usam as listas que a API já entrega. O backend não mudou.

## 📁 Arquivos criados

- `frontend/src/components/ui/cnpj-field.tsx` — campo de CNPJ com máscara.
- `frontend/src/pages/TenantFormPage.tsx` — cadastro de empresa em tela própria.
- `_logs/2026-11-09_configuracoes-visual.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/SettingsPage.tsx` — hub da conta, da senha e dos atalhos.
- `frontend/src/pages/ChangePasswordPage.tsx` — formulário de senha no padrão do site.
- `frontend/src/pages/TenantsPage.tsx` — lista, pesquisa e ações da empresa.
- `frontend/src/pages/TenantDetailPage.tsx` — ficha e edição da empresa.
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas de notificações.
- `frontend/src/components/layouts/AppHeader.tsx` — número de avisos não lidos no sininho.
- `frontend/src/App.tsx` — rotas de nova empresa e de edição.
- `frontend/src/page-headings.ts` — títulos das telas novas.
- `frontend/src/services/workforce.service.ts` — aviso para atualizar o sininho.
- `frontend/src/utils/digits.ts` — máscara progressiva de CNPJ.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A exclusão da conta não aparece em configurações.
- Editar e excluir empresa só na empresa selecionada.
- O sininho conta os avisos sem leitura percorrendo a lista já existente.

## 🧪 Como testar

1. Abrir Configurações e conferir a conta, a verificação de e-mail e o atalho de senha.
2. Abrir Empresas, pesquisar, visualizar, editar e criar uma empresa com CNPJ mascarado.
3. Abrir Notificações e percorrer as abas Avisos, No sistema e No e-mail.
4. Conferir o número no sininho e marcar um aviso como lido para o número diminuir.
