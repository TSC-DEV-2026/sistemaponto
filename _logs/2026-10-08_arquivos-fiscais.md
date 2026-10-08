# Log — arquivos fiscais

**Data:** 2026-10-08  
**Sessão:** ponto 6 do plano, só o backend

---

## ✅ O que foi feito

- A exportação de AFD não depende de período fechado
- A importação cria marcação com origem `afd`. Se a marcação já existe, só ela é ignorada e as demais seguem
- A exportação de AEJ sai só de período fechado, com o mesmo início e o mesmo fim
- Os totais da folha levam horas trabalhadas, hora extra, adicional noturno, falta e saldo do banco
- Arquivo de período cancelado ou reaberto deixa de valer e precisa ser gerado de novo

## 📁 Arquivos criados

- `backend/app/core/fiscal_file.py` — texto do AFD, do AEJ e da folha
- `backend/alembic/versions/0007_fiscal_files.py` — tabela do arquivo gerado; a revisão foi aplicada no banco

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — arquivo fiscal
- `backend/app/models/__init__.py` — registro do model
- `backend/app/schemas/workforce.py` — arquivo, importação e totais da folha
- `backend/app/repositories/workforce_repository.py` — marcação existente, período fechado exato e arquivos que cruzam o período
- `backend/app/services/workforce_service.py` — exportação, importação, totais e invalidação
- `backend/app/api/routes/workforce.py` — rotas de `fiscal-files` e importação
- `backend/app/core/resource_catalog.py` — recurso `fiscal-files`
- `backend/app/core/workforce.py` — origem `afd`
- `backend/tests/test_workforce_service.py` — AFD, AEJ, folha, invalidação e permissão
- `backend/tests/test_resource_catalog.py` — nome do recurso novo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Os documentos não descrevem o leiaute da Portaria 671. O arquivo deste corte é o texto do sistema: AFD com CPF e horário, AEJ com o dia e as marcações, folha com os cinco totais
- Marcação já existente é o mesmo funcionário no mesmo instante. CPF desconhecido ou período fechado não grava aquela linha e não interrompe as outras
- O saldo do banco na folha é o saldo até o fim do período, limitado a hoje. O adicional noturno é o percentual, e a falta é a falta de tempo
- Cancelar ou reabrir invalida o arquivo que cruza o período. O arquivo permanece no histórico

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Commit e pull request desta branch, quando for pedido
- O site ainda não gera nem importa esses arquivos
- O leiaute oficial da Portaria 671 não está descrito nos documentos
