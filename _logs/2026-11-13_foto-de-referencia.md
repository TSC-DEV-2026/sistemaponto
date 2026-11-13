# Log — foto de referência já enviada

**Data:** 2026-11-13  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Na edição do funcionário, com reconhecimento facial, o formulário avisa quando a foto de referência já está no cadastro.
- O aviso traz o link Ver foto quando o endereço da foto existe. Enviar outra foto continua possível e substitui a atual.

## 📁 Arquivos criados

- `_logs/2026-11-13_foto-de-referencia.md` — este log

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — aviso, texto do campo e da dica quando a foto já foi enviada

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O aviso usa a chave da foto ou o endereço já devolvido pela API. Não há campo novo.
- Sem uma foto nova no salvamento, a foto atual permanece.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- O link Ver foto vale 60 segundos. Depois disso o armazenamento responde que o pedido expirou.
