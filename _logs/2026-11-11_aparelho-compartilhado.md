# Log — aparelho compartilhado

**Data:** 2026-11-11  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A API passou a gerar o código de liberação, parear o aparelho com a empresa e revogar só o vínculo daquela conta.
- O reconhecimento facial e o QR Code do aparelho comparam cada empresa separada. A marcação entra se uma única pessoa for reconhecida.
- O site ganhou a tela Aparelhos, em Gestão, para o administrador gerar o código e revogar.
- A migração só cria tabelas novas. Funcionários, marcações e rostos que já existiam não foram alterados.

## 📁 Arquivos criados

- `backend/alembic/versions/0014_clock_devices.py` — tabelas do aparelho, do código, do vínculo e das tentativas
- `backend/app/repositories/clock_device_repository.py` — leitura e gravação dessas tabelas
- `backend/app/schemas/clock_device.py` — contratos da liberação, do aparelho e da marcação
- `backend/app/services/clock_device_service.py` — código de uso único, chave por empresa e comparação separada
- `backend/app/api/routes/clock_devices.py` — rotas do administrador e do aparelho
- `backend/tests/test_clock_device_service.py` — código único, duas empresas, revogação e trava de tentativas
- `frontend/src/pages/workforce/ClockDevicesPage.tsx` — tela de gerar código e revogar
- `frontend/src/services/clock-device.service.ts` — chamadas da tela

## ✏️ Arquivos modificados

- `backend/app/models/workforce.py` — modelos das tabelas novas
- `backend/app/services/workforce_service.py` — marcação do aparelho sem sessão de funcionário; o simples continua recusado
- `backend/app/api/dependencies/services.py` — serviço do aparelho
- `backend/app/core/resource_catalog.py` — recurso clock-devices
- `backend/main.py` — rotas e cabeçalhos do aparelho
- `backend/tests/test_resource_catalog.py` — catálogo inclui o aparelho
- `backend/tests/test_workforce_service.py` — rosto e QR Code sem a sessão da pessoa
- `frontend/src/App.tsx` — rota /clock-devices
- `frontend/src/navigation.ts` — item Aparelhos em Gestão
- `frontend/src/page-headings.ts` — título da tela
- `frontend/src/types/api.ts` — tipos do aparelho e do código

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O aplicativo `mobile2` fica para depois. A API já atende o pareamento, os métodos, os embeddings por empresa e as marcações facial e QR Code.
- A chave e o código ficam guardados só como hash. A chave volta uma vez, na liberação.
- Revogar troca o hash e marca a data. A marcação antiga da pessoa permanece.
- Cinco códigos errados no mesmo identificador travam novas tentativas por 10 minutos.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Criar o aplicativo em `mobile2`, com a mesma identidade visual, usando estas rotas.
- O QR Code continua só online no `mobile` e no `mobile2`.
