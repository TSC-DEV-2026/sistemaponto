# Log — tipo de arquivo fiscal

**Data:** 2026-10-22  
**Sessão:** ponto 27 do plano, só o site

---

## ✅ O que foi feito

- Em Fiscal / Folha, a escolha do arquivo passou a se chamar "Tipo de arquivo"
- Com AFD, a tela mostra "Arquivo com as marcações. Sai de qualquer período."
- Com AEJ, a tela mostra "Arquivo da jornada. Sai só de um período fechado."
- O botão passou a ser "Gerar AFD" ou "Gerar AEJ", conforme o arquivo escolhido
- O mês continua a lista do ponto 25

## 📁 Arquivos criados

- Nenhum

## ✏️ Arquivos modificados

- `frontend/src/pages/workforce/OperationsPages.tsx` — rótulo, texto e botão da geração

## 🗑️ Arquivos removidos

- Nenhum

## 📦 Dependências

- Nenhuma

## 🧭 Decisões

- A folha continua no mesmo formulário. O botão dela segue "Gerar", porque o ponto só nomeia AFD e AEJ
- O filtro da lista de arquivos gerados continua "Tipo". A escolha do arquivo é o campo do formulário
- A API não mudou
- O aplicativo não tem essa tela

## ⚠️ Problemas

- Nenhum

## 📌 Pendências

- Nenhuma. O teste foi feito antes do commit
