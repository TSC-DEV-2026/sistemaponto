# Log — fiscal e folha em opções

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Fiscal / Folha passou a ter as opções AFD e Totais da folha.
- AFD gera o AFD e o AEJ e lista os arquivos. A importação escolhe um arquivo `.txt` e envia o texto que a API já recebe.
- Totais da folha consulta o mês: horas trabalhadas, hora extra, adicional noturno, falta de tempo e saldo do banco.
- O arquivo da folha continua podendo ser gerado. Ele aparece na lista da opção AFD.

## 📁 Arquivos criados

- `_logs/2026-10-22_fiscal-em-opcoes.md` — este registro

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — as duas opções e a leitura do arquivo

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- O AEJ permanece na opção AFD, porque sai do mesmo gerador.
- Consultar os números continua com o administrador. Gerar e importar arquivo continua com o administrador e o gestor.
- O arquivo da folha não ficou no seletor do AFD. O botão Gerar arquivo está nos totais e a lista de AFD ainda mostra esse arquivo.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- A tela não foi clicada no navegador. A checagem foi o TypeScript.
