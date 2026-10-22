# Log — formulário sem person id

**Data:** 2026-10-22  
**Sessão:** ponto 1, site e aviso do app

---

## ✅ O que foi feito

- O cadastro e a edição do funcionário deixam de pedir o Acesso (person id) e deixam de enviar `person_id`
- A ficha do funcionário também deixa de mostrar esse número
- O texto de Pessoas explica que o acesso nasce no cadastro e o papel continua em Permissões e Acessos
- O app do funcionário deixa de orientar a procurar o identificador em Permissões e Acessos quando não há ficha

## 📁 Arquivos criados

- `_logs/2026-10-22_formulario-sem-person-id.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/EmployeeFormPage.tsx` — remove o campo e o envio do `person_id`
- `frontend/src/pages/workforce/EmployeePage.tsx` — remove o campo somente leitura
- `frontend/src/pages/workforce/PeoplePage.tsx` — texto da lista de pessoas
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — aviso quando não há funcionário ligado

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O app não cadastra funcionário. A única alteração nele é o texto que ainda apontava o fluxo antigo
- O e-mail continua opcional na tela. A API exige o valor só quando o CPF ainda não existe, e a mensagem volta no formulário

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- Ponto 2, tipo de registro no app
