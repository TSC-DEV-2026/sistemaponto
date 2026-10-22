# Log — impressão de relatório

**Data:** 2026-10-22  
**Sessão:** ponto 26 do plano, só o site

---

## ✅ O que foi feito

- Em Relatórios, o rótulo da lista de grupos passou a ser "Tipo de relatório"
- O resultado mostra "N registros encontrados". Zero registro usa "Nenhum registro neste período."
- O botão Imprimir gera o PDF da consulta atual, com todos os registros do período, não só os da página visível
- O PDF leva o nome do relatório e o intervalo De até

## 📁 Arquivos criados

- `frontend/src/utils/report-pdf.ts` — PDF do relatório

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — rótulo, contagem e botão Imprimir
- `frontend/src/services/workforce.service.ts` — a consulta do PDF pede até 100 linhas por página

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- A lista na tela continua paginada. O PDF busca as páginas seguintes da mesma consulta
- A API do relatório não mudou
- O aplicativo não tem relatório gerencial
- O ponto 27 não entrou

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
