# Log — apuração mais rápida

**Data:** 2026-11-16  
**Sessão:** a apuração e o fechamento pediam a jornada de novo em cada dia

---

## ✅ O que foi feito

- A jornada, a versão e os horários passam a ser lidos uma vez durante o cálculo.
- O saldo do banco acompanha os dias já apurados, sem refazer o mês.
- A marcação usada na apuração não traz mais as colunas de foto.
- O texto da resposta da API permanece o mesmo.

## 📁 Arquivos criados

- `backend/tests/test_hour_bank.py` — o saldo do dia segue a mesma projeção
- `_logs/2026-11-16_apuracao-rapida.md` — este log

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — reaproveita a jornada no cálculo
- `backend/app/repositories/workforce_repository.py` — marcações sem as fotos
- `backend/app/core/hour_bank.py` — saldo de vários dias numa caminhada

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A lista de pessoas do fechamento já era rápida e ficou como estava.
- Quem entra no fechamento e o que a folha mostra não mudou.

## 🐛 Problemas encontrados e soluções

- Apurar um mês lia a jornada centenas de vezes. A leitura ficou guardada enquanto os dias daquele pedido são calculados.

## 📌 Pendências / próximos passos

- —
