# Log — pedido e cancelamento da solicitação

**Data:** 2026-10-30  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- A nova solicitação passou a um formulário em cards, com o botão de incluir horário no canto direito e no máximo dois horários por linha.
- O card Como funciona saiu da tela. A foto do atestado continua só quando o tipo é atestado.
- A observação longa do card da lista fica em até 50 caracteres. O link Ver mais abre o texto inteiro.
- A data da marcação pedida aparece uma vez. Os horários seguintes vêm separados por --.
- A pessoa cancela a própria solicitação pendente. O ponto não muda.

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/RequestFormPage.tsx` — formulário da nova solicitação
- `frontend/src/pages/workforce/OperationsPages.tsx` — lista, descrição completa e cancelamento
- `frontend/src/components/workforce/TimeOffFields.tsx` — foto do atestado em coluna na solicitação
- `frontend/src/components/ui/time-picker-field.tsx` — rótulo acessível do horário

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- Cancelar continua só para a própria solicitação pendente. Gestor e administrador seguem aprovando ou recusando o pedido dos outros.
- A observação da lista não é cortada na API. O limite de 50 caracteres é só visual.

## 🐛 Problemas encontrados e soluções

- Texto longo atravessava as colunas do card → a observação fica limitada e o restante abre no diálogo.

## 📌 Pendências / próximos passos

- Verificador lê o diff. Quem testa roda o roteiro. Não fazer merge antes dos dois aceites.
