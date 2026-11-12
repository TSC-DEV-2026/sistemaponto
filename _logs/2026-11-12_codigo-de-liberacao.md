# Log — código de liberação

**Data:** 2026-11-12  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- O código de liberação passou a ter 9 caracteres, com letras e números.
- Cada código fica único na base, inclusive depois de usado ou vencido. Duas empresas não recebem o mesmo código.
- Os códigos que já existiam foram mantidos. Não havia repetido, e o índice único foi criado por cima.

## 📁 Arquivos criados

- `backend/alembic/versions/0015_unique_release_code.py` — índice único do código, sem apagar linha

## ✏️ Arquivos modificados

- `backend/app/services/clock_device_service.py` — gera 9 caracteres e recusa um código já gravado
- `backend/app/repositories/clock_device_repository.py` — consulta se o código já existe
- `backend/app/models/workforce.py` — unicidade do código no modelo
- `backend/tests/test_clock_device_service.py` — repetição entre empresas e formato novo
- `mobile2/lib/features/device/presentation/screens/setup_screen.dart` — o campo aceita letras
- `cursor_instructions_ponto/09-PLANO-DE-DESENVOLVIMENTO.md` — o ponto 13 descreve o código de 9 caracteres

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O alfabeto deixa de fora 0, O, 1, I e L, para o código digitado no aparelho não se confundir.
- O site mostra o código em três grupos. O aparelho aceita com ou sem espaço, em maiúscula ou minúscula.
- A garantia fica no índice único. Se duas gerações coincidirem no mesmo instante, a API tenta outro código.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e push ainda não foram feitos.
