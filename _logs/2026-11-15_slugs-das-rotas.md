# Log — slugs das rotas

**Data:** 2026-11-15  
**Sessão:** deixar o endereço em inglês e o texto da tela em português

---

## ✅ O que foi feito

- Quadro passou de `/people` para `/staff`. A aba Funções fica em `/staff?tab=jobs`.
- Ponto passou de `/schedules` para `/timekeeping`. Apurações, banco e fechamento usam `calculation`, `hour-bank` e `closing`.
- As outras abas da tela também ficaram com slug em inglês: estrutura, regras, motivos, plano, avisos e folha.
- O parâmetro da aba passou de `aba` para `tab`. A nova ocorrência usa `kind` no lugar de `tipo`.
- Endereços antigos continuam abrindo a mesma tela e são reescritos para o slug novo.
- A API já usava recursos em inglês (`/employees`, `/jobs`, `/closings`, `/time-results`) e permaneceu.

## 📁 Arquivos criados

- `frontend/src/route-slugs.ts` — tradução do endereço antigo
- `_logs/2026-11-15_slugs-das-rotas.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/App.tsx` — rotas e redirecionamento
- `frontend/src/page-headings.ts` — título de cada endereço
- `frontend/src/navigation.ts` — menu
- `frontend/src/components/layouts/AppShell.tsx` — item ativo
- `frontend/src/pages/HomePage.tsx` — atalhos
- `frontend/src/pages/PlanPage.tsx` — abas do plano
- `frontend/src/pages/workforce/PeoplePage.tsx` — abas do quadro
- `frontend/src/pages/workforce/JourneyPage.tsx` — abas do ponto
- `frontend/src/pages/workforce/OperationsPages.tsx` — abas das demais telas
- `frontend/src/pages/workforce/EntityScreens.tsx` — parâmetro `tab`
- `frontend/src/pages/workforce/catalogs.ts` — volta da ficha
- `frontend/src/pages/workforce/OccurrencePages.tsx` — abas e nova ocorrência
- `frontend/src/pages/workforce/EmployeePage.tsx` — volta do funcionário
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — volta da edição
- `frontend/src/pages/workforce/ClosingResultPage.tsx` — volta do fechamento
- `frontend/src/pages/workforce/ApuracaoDayPage.tsx` — volta da apuração

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O texto visível permanece em português. Só o endereço muda.
- `staff` nomeia o quadro. `timekeeping` nomeia o ponto.
- A primeira aba também fica no endereço, como `/timekeeping?tab=calculation` e `/organization?tab=units`.
- A API não foi renomeada: os caminhos já descrevem o recurso e o aplicativo depende deles.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
