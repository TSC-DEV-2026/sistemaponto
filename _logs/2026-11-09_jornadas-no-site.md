# Log — jornadas no site

**Data:** 2026-11-09  
**Sessão:** frontend do ponto 12

---

## ✅ O que foi feito

- O cadastro de jornada passou a pedir Programada, Carga ou Livre.
- A programada nova abre com a semana já conhecida: segunda a sexta em 08:00–12:00 e 13:30–17:30, sábado e domingo de folga. Os dias e os horários podem ser alterados.
- A alteração de conteúdo pede a data em que passa a valer. Mudar a quantidade de dias pede o dia da sequência de quem já está na jornada.
- A lista, a ficha e a apuração descrevem o tipo vigente.
- A operação em massa de jornada pede o dia da sequência quando a jornada é programada. Na de sete dias, a sugestão continua sendo o dia da semana da vigência.

## 📁 Arquivos criados

- `frontend/src/pages/workforce/journey.ts` — rótulos, resumo, validação e a semana inicial.
- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — cadastro, edição e visualização da jornada.
- `frontend/src/components/workforce/JourneySchedule.tsx` — leitura da jornada na ficha e no detalhe.
- `_logs/2026-11-09_jornadas-no-site.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EntityScreens.tsx` — a jornada usa a tela nova e a lista mostra o tipo.
- `frontend/src/pages/workforce/catalogs.ts` — o catálogo deixa de pedir os quatro horários.
- `frontend/src/pages/workforce/EmployeePage.tsx` — a ficha mostra a sequência, a carga ou a livre, e o dia da vigência.
- `frontend/src/pages/workforce/BulkChangesPage.tsx` — a jornada programada pede o dia da sequência.
- `frontend/src/components/workforce/TimeResultsPanel.tsx` — o texto da apuração deixa a escala 5x2 fixa.
- `frontend/src/services/workforce.service.ts` — tipos dos dias, da carga, da tolerância e do dia do ciclo.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A programada nova começa na semana 5x2, para o cadastro atual não nascer vazio. Os quatro horários soltos saíram do formulário.
- Sem pessoas na jornada, mudar a quantidade de dias não pede âncora.
- A operação em massa só mostra o dia da sequência na programada. Carga e livre seguem só com a data.
- O site foi verificado até a tela de entrar. A sessão do navegador não estava autenticada, então o formulário logado não foi percorrido.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Rodar `alembic upgrade head` se o banco local ainda não tiver a migração das jornadas.
- Entrar no site e conferir o cadastro, a ficha e a operação em massa com uma jornada já existente.
