# Log — acesso por papel

**Data:** 2026-11-18  
**Sessão:** o que cada papel vê e opera

---

## ✅ O que foi feito

- Administrador continua sem o Registro. Gestor abre o restante do sistema, menos Permissões e Acessos, Plano e Assinatura e Organizações. Em Minha conta, gestor e membro ficam com Segurança e Notificações.
- Membro vê Dashboard e Solicitações. O saldo do banco e o histórico das marcações ficam no dashboard, abaixo das solicitações.
- Administrador e gestor mantêm os cartões do dashboard. Abaixo, quem está ligado a um funcionário vê o saldo do banco e o histórico de marcações da própria conta.
- O membro, em Solicitações, não filtra por funcionário. A lista é a dele. Nova solicitação continua disponível.
- Registro saiu do menu do site. O ponto continua no aplicativo.
- O gestor passa a gravar cadastros, ocorrências, aparelhos, massa e folha. Plano, cobrança, permissões e organizações continuam só do administrador. A lista de pessoas do gestor segue a equipe e os funcionários que o têm como gestor.

## 📁 Arquivos criados

- `frontend/src/components/workforce/OwnClockSummary.tsx` — saldo do banco e histórico de marcações
- `_logs/2026-11-18_acesso-por-papel.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/navigation.ts` — menu e rotas por papel
- `frontend/src/components/layouts/AppShell.tsx` — filtro do menu e bloqueio de rota
- `frontend/src/pages/HomePage.tsx` — dashboard do membro
- `frontend/src/pages/SettingsPage.tsx` — conta reduzida
- `frontend/src/pages/workforce/OperationsPages.tsx` — registro com saldo e histórico; consulta da folha para o gestor
- `frontend/src/pages/workforce/EntityScreens.tsx` — edição para o gestor
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — edição para o gestor
- `frontend/src/pages/workforce/EmployeePage.tsx` — exclusão e auditoria para o gestor
- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — edição para o gestor
- `frontend/src/pages/workforce/OccurrencePages.tsx` — lançamento e edição para o gestor
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — massa para o gestor
- `frontend/src/pages/workforce/ClockDevicesPage.tsx` — aparelhos para o gestor
- `backend/app/api/dependencies/auth.py` — papel de operação
- `backend/app/api/routes/clock_devices.py` — aparelhos para o gestor
- `backend/app/services/clock_device_service.py` — aparelhos para o gestor
- `backend/app/services/workforce_service.py` — gravação operacional para o gestor

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O gestor não passa a ver todos os funcionários. Continua na equipe e em quem o lista como gestor.
- Membro também chega em Notificações pelo sino e em Minha conta pelo menu do perfil, nos mesmos dois blocos do gestor.
- No site, Registro não aparece para nenhum papel. O aplicativo de ponto permanece como está.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A tela logada não foi percorrida neste ajuste.
