# Log — lista de QR para imprimir

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A API passou a listar os QR Codes que podem ir para o papel: nome, unidade, matrícula e o texto `unidade|cpf|matrícula`.
- Entram só funcionários com tipo `qr`, matrícula e unidade vigente. Sem matrícula ou sem unidade, a pessoa fica de fora.
- A lista respeita quem o acesso enxerga. Administrador vê a empresa. Gestor vê a equipe. Funcionário vê o próprio cartão, se ele existir.
- A marcação por QR não mudou.

## 📁 Arquivos criados

- `_logs/2026-10-22_qr-para-imprimir.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/schemas/workforce.py` — saída do cartão
- `backend/app/services/workforce_service.py` — seleção de quem pode imprimir
- `backend/app/api/routes/workforce.py` — `GET /qr-cards`
- `backend/tests/test_workforce_service.py` — cartão pronto, incompleto e visibilidade

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A consulta é paginada, como as outras listas. O PDF fica para o site.
- O texto do código continua o mesmo que o aplicativo já lê.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Botão Gerar QR Code no site, com o PDF separado por pessoa e o nome acima do desenho
