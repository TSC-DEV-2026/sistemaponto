# Log — seções de configurações

**Data:** 2026-10-21  
**Sessão:** ponto 21 do plano, só o site

---

## ✅ O que foi feito

- Configurações passou a ter as seções Minha conta, Notificações e Permissões e acessos
- Minha conta mostra nome, e-mail e CPF. Editar abre nome e e-mail. O CPF continua só leitura
- Excluir pede confirmação e remove o acesso desta pessoa nesta empresa
- Se ela for a única administradora, a tela mostra "A empresa precisa de um administrador."
- Notificações continua o botão que abre a tela de avisos
- Permissões e acessos abre a lista de vínculos. O item da barra lateral permanece
- Minha conta, Empresas, Notificações e Permissões e acessos ficam em blocos separados
- Trocar senha e reenviar verificação ficam no bloco Minha conta
- O aplicativo não tem essa tela, então não foi alterado

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/pages/SettingsPage.tsx` — três seções, leitura, edição e saída da empresa
- `frontend/src/services/auth.service.ts` — salvar conta e sair da empresa
- `frontend/src/types/api.ts` — CPF na sessão

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- A gravação de nome e e-mail e a saída da empresa usam a API que já entrou na main
- Quem ainda tem outra empresa troca para ela. Quem não tem volta ao login
- O ponto 22 não entrou

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
