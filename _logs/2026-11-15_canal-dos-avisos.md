# Log — canal dos avisos

**Data:** 2026-11-15  
**Sessão:** passo 5 dos avisos

---

## ✅ O que foi feito

- O sino e a aba Avisos mostram os avisos já recebidos nesta conta.
- As abas No sistema e No e-mail saíram.
- A aba Preferências escolhe cada aviso e o canal: sistema, e-mail ou os dois.
- Sem escolha gravada, os dois canais continuam ligados.
- O aplicativo do funcionário usa a mesma escolha de canal.

## 📁 Arquivos criados

- `backend/alembic/versions/0018_notice_channels.py` — coluna do canal
- `_logs/2026-11-15_canal-dos-avisos.md` — este log

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — canal na preferência
- `backend/app/core/notices.py` — canais aceitos
- `backend/app/schemas/workforce.py` — canal na API
- `backend/app/services/workforce_service.py` — envio segue o canal
- `backend/app/repositories/workforce_repository.py` — evita repetir o e-mail do dia
- `backend/tests/test_workforce_service.py` — canal separado e canal inválido
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas Avisos e Preferências
- `frontend/src/services/workforce.service.ts` — tipo da preferência
- `mobile/lib/features/app/presentation/screens/notices_screen.dart` — canal no aplicativo
- `cursor_instructions_ponto/03-MOBILE-APP-SCOPE.md` — regra do canal
- `cursor_instructions_ponto/04-BUSINESS-RULES-AND-WORKFLOWS.md` — regra do canal

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A preferência antiga, só ligada ou desligada, continua valendo. Ligada sem canal gravado equivale aos dois.
- O histórico de e-mail sai da tela. O envio do e-mail permanece.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Os passos seguintes (filtros de relatório e vários gestores) ainda não foram feitos.
