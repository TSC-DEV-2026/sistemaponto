# Log — banco de horas

**Data:** 2026-10-08  
**Sessão:** ponto 4 do plano, só o backend

---

## ✅ O que foi feito

- O funcionário pode usar banco de horas. Sem banco, o que passa da jornada continua hora extra e o que fica abaixo vira falta de tempo, com desconto
- Com banco, o excedente soma no saldo e o que fica abaixo compensa. O adicional noturno não entra nesses minutos
- O saldo é contínuo, sem limite, e segue até a quitação. O prazo é de 6 meses e, neste corte, só gera o aviso "Saldo irá expirar em x dias"
- O gestor da equipe e o administrador quitam no todo ou em parte. Saldo positivo sai como hora extra; saldo negativo sai como falta
- Os dois também lançam crédito ou débito manual. O funcionário só consulta o próprio saldo
- Período fechado bloqueia quitação e lançamento manual. Fora do fechamento, os dois seguem

## 📁 Arquivos criados

- `backend/app/core/hour_bank.py` — saldo, créditos, débitos e aviso de expiração
- `backend/alembic/versions/0005_hour_bank.py` — escolha do banco no funcionário e lançamentos; a revisão foi aplicada no banco

## ✏️ Arquivos modificados

- `backend/app/core/time_result.py` — com banco, o excedente vai para o saldo; sem banco, a falta de tempo fica na apuração
- `backend/app/models/workforce.py` — escolha do funcionário e lançamento do banco
- `backend/app/schemas/workforce.py` — entrada e saída do saldo e dos lançamentos
- `backend/app/services/workforce_service.py` — consulta, quitação, crédito e débito
- `backend/app/repositories/workforce_repository.py` — lê os lançamentos do funcionário
- `backend/app/api/routes/workforce.py` — `GET /api/v1/hour-bank` e o recurso de lançamentos
- `backend/app/core/resource_catalog.py` — inclui o recurso no catálogo
- `backend/app/models/__init__.py` — registra o lançamento
- `backend/tests/test_workforce_service.py` — saldo, quitação, noturno, aviso e período fechado
- `backend/tests/test_resource_catalog.py` — nome do recurso novo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A escolha fica no funcionário e vale para o saldo inteiro. O saldo é calculado na consulta, junto com a apuração
- O prazo de 6 meses não zera o saldo. O efeito deste corte é só o aviso
- O bloqueio de fechamento por solicitação pendente ou ponto incompleto fica para o ponto 5

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site e o app ainda não consultam nem quitam o banco
