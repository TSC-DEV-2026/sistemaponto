# Log — equipe define setor e unidade

**Data:** 2026-10-24  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A ficha deixou de oferecer unidade e setor no vínculo. Os dois continuam visíveis, preenchidos pela equipe.
- Ao registrar uma equipe, a API grava na mesma data a equipe, o setor dessa equipe e a unidade desse setor.
- Unidade e setor lançados direto na ficha passam a ser recusados. O que já existia permanece até a próxima equipe.
- Mover a equipe de setor no cadastro não altera quem já estava nela. Uma nova vigência de equipe realinha os três.
- O aplicativo não mudou. Ele só lê a unidade que a API já devolve.

## 📁 Arquivos criados

- `_logs/2026-10-24_equipe-define-setor.md` — este registro

## ✏️ Arquivos modificados

- `backend/app/services/workforce_service.py` — a equipe grava setor e unidade e a ficha recusa os dois
- `backend/app/api/routes/workforce.py` — a criação da vigência explica que unidade e setor acompanham a equipe
- `backend/tests/test_workforce_service.py` — a troca de equipe realinha os três e o QR passa a nascer da equipe
- `frontend/src/pages/workforce/EmployeePage.tsx` — unidade e setor saíram da lista de vínculo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A foto de referência do reconhecimento facial continua obrigatória. Isso fica para o ponto 10.
- O histórico de unidade e setor permanece filtrável. A recusa vale só para gravar um vínculo novo desses tipos.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Ponto 10: operações em massa, inclusive o tipo de registro, e salvar o facial sem foto de referência.
