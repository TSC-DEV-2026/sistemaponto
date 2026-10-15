# Log — cursor da máscara de CPF

**Data:** 2026-10-15  
**Sessão:** correção do cursor ao apagar no meio do CPF

---

## ✅ O que foi feito

- Apagar ou digitar no meio do CPF mantém o cursor nesse ponto, no site e no aplicativo
- O cursor não volta mais para o fim da linha
- Apagar o ponto ou o traço remove o dígito anterior, em vez de só recolocar a máscara

## 📁 Arquivos criados

- `frontend/src/components/ui/cpf-field.tsx` — campo de CPF que reposiciona o cursor depois da máscara

## ✏️ Arquivos modificados

- `frontend/src/utils/digits.ts` — calcula o cursor a partir dos dígitos que ficaram antes dele
- `frontend/src/pages/LoginPage.tsx` — CPF do entrar
- `frontend/src/pages/RegisterPage.tsx` — CPF do criar conta
- `frontend/src/pages/MembershipFormPage.tsx` — CPF do vínculo
- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — CPF do funcionário novo
- `frontend/src/pages/workforce/EmployeePage.tsx` — CPF do cadastro
- `mobile/lib/core/utils/digits.dart` — o mesmo cálculo do cursor
- `mobile/lib/core/utils/cpf_formatter.dart` — deixa de forçar o cursor para o fim
- `mobile/test/digits_test.dart` — apagar dígito no meio e apagar o ponto

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A posição guardada é a quantidade de dígitos antes do cursor. A máscara muda o tamanho do texto, então o índice cru da letra não serve
- O mesmo campo vale para todos os CPFs, não só o login, porque o pulo do cursor vinha da máscara compartilhada

## 🐛 Problemas encontrados e soluções

- Apagar no meio devolvia o cursor para o fim → o campo agora aplica a posição depois de reformatar o valor

## 📌 Pendências / próximos passos

- —
