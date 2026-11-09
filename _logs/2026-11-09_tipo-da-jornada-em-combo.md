# Log — tipo da jornada em combo

**Data:** 2026-11-09  
**Sessão:** troca das abas da jornada por um combo

---

## ✅ O que foi feito

- O cadastro e a edição da jornada deixaram de usar abas para o tipo.
- O tipo passou a ser um combo. Abaixo dele aparecem só os campos do tipo escolhido.
- A frase de apoio do tipo ficou embaixo do combo.

## 📁 Arquivos criados

- `_logs/2026-11-09_tipo-da-jornada-em-combo.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/JourneyRecordPage.tsx` — o tipo virou combo e os campos seguem a opção selecionada.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O combo usa o mesmo seletor dos outros campos do cadastro.
- Nome continua acima do tipo, porque vale para os três. Data e observação continuam abaixo, pelo mesmo motivo.
- Livre não abre campo extra. A frase embaixo do combo explica o tipo.

## 🐛 Problemas encontrados e soluções

- A tela de jornada nova redireciona para o login quando não há sessão. O formulário logado não foi percorrido no navegador.

## 📌 Pendências / próximos passos

- Conferir o combo autenticado em Nova jornada: Programada mostra os dias, Carga mostra o total da semana e Livre não mostra campo de horário.
