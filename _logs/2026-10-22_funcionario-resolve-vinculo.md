# Log — funcionário resolve pessoa e vínculo

**Data:** 2026-10-22  
**Sessão:** ponto 1, só a API

---

## ✅ O que foi feito

- `POST /employees` acha ou cria a pessoa pelo CPF no autenticador e grava `employees.person_id`
- CPF novo exige e-mail e dispara o convite. CPF existente reaproveita o `person_id` e não altera nome, e-mail nem senha de lá
- Sem membership nesta empresa, cria o vínculo com papel `member`. Com membership, reutiliza a linha
- A edição da ficha não resolve de novo pelo CPF. O `person_id` gravado permanece
- `person_id` saiu de `EmployeeCreate` e `EmployeeUpdate`. A resposta e o filtro da lista continuam com o campo

## 📁 Arquivos criados

- `_logs/2026-10-22_funcionario-resolve-vinculo.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — resolve pessoa e vínculo na criação
- `backend/app/services/authenticator_client.py` — upsert aceita e-mail ausente
- `backend/app/schemas/workforce.py` — create e update sem `person_id`
- `backend/app/api/routes/workforce.py` — descrição das rotas de criar e atualizar
- `backend/app/api/dependencies/services.py` — injeta o autenticador no serviço
- `backend/tests/test_workforce_service.py` — cobertura do vínculo e do `person_id` estável
- `backend/tests/fakes.py` — upsert sem e-mail recusa CPF novo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O e-mail só é obrigatório quando o CPF ainda não existe no autenticador. Para isso o upsert do autenticador passou a aceitar e-mail vazio e responde 400 nesse caso
- Vínculo novo nasce `member`. Papel já existente não é reescrito
- A evidência do 409 de acesso já ligado acontece antes de criar outro membership

## 🐛 Problemas encontrados e soluções

- Os testes antigos passavam `person_id` no corpo. O serviço deixou de lê-lo. O dublê de pessoas liga o CPF ao id que o teste já usava, para o restante da suíte continuar válido

## 📌 Pendências / próximos passos

- Site e app: tirar o campo Acesso (person id) do formulário do funcionário
- Ponto 2 permanece só no plano
