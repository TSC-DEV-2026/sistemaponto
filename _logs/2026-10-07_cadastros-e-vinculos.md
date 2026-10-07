# Log — cadastros e vínculos

**Data:** 2026-10-07  
**Sessão:** cadastros de pessoas, ponto e solicitações

---

## ✅ O que foi feito

- Funcionário, cargo, centro de custo, estrutura, jornada, marcação, ocorrência, solicitação, fechamento, motivo, feriado, sindicato, acordo e regra de ponto passam a gravar
- O funcionário reúne dados, trabalho, ponto, ocorrências e histórico. Cargo, jornada e os demais vínculos têm vigência
- Solicitação pendente não altera a marcação. Aprovar um ajuste grava a marcação. Recusa e cancelamento mantêm o ponto
- Funcionário desligado deixa de ocupar a capacidade do plano
- Fechar um mês impede alteração naquele período
- O app registra a marcação do próprio funcionário e envia solicitação, quando o cadastro está ligado ao acesso

## 📁 Arquivos criados

- `backend/app/models/workforce.py`, `backend/app/schemas/workforce.py`, `backend/app/services/workforce_service.py`, `backend/app/repositories/workforce_repository.py`
- `backend/app/api/routes/workforce.py`, `backend/app/core/workforce.py`
- `backend/alembic/versions/0002_workforce.py`
- `backend/tests/test_workforce_service.py`
- `frontend/src/pages/workforce/`, `frontend/src/components/workforce/`, `frontend/src/services/workforce.service.ts`, `frontend/src/utils/labels.ts`
- `mobile/lib/features/app/data/page_items.dart`

## ✏️ Arquivos modificados

- `backend/main.py`, `backend/app/core/resource_catalog.py`, `backend/app/models/__init__.py` — rotas e catálogo
- `backend/app/services/membership_service.py` — papel de gestor
- `frontend/src/App.tsx`, `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/PlanPage.tsx` — telas ligadas aos cadastros
- `mobile/lib/features/app/presentation/screens/home_screen.dart`, `mobile/lib/features/app/presentation/screens/requests_screen.dart`

## 🗑️ Arquivos removidos

- Nenhum

## 🔗 Dependências adicionadas

- Nenhuma

## ⚠️ Decisões tomadas

- Apuração, banco de horas, catálogo de relatórios, AFD, AEJ, canais de notificação, fluxo de férias e reabertura de fechamento não foram inventados
- O app grava a marcação do horário atual. Registro simples, QR Code e reconhecimento facial continuam sem comportamento definido
- O gestor aprova solicitações da própria equipe e não decide a própria solicitação

## 🐛 Problemas encontrados e soluções

- A API que estava no ar foi reiniciada para carregar os cadastros. A migration `0002_workforce` foi aplicada no banco `sistemaponto`

## 📌 Pendências / próximos passos

- Regras ainda abertas: cálculo da apuração, banco de horas, modalidades de registro, reabertura de fechamento, relatórios, AFD e AEJ
