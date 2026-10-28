# Log — sidebar verde

**Data:** 2026-10-28  
**Sessão:** redesenho do menu lateral

---

## ✅ O que foi feito

- A sidebar passou a ter fundo verde escuro, com círculos feitos só em CSS
- O item da rota atual fica numa aba branca, com curvas na borda direita
- O menu pode recolher e expandir no desktop. O estado fica gravado neste navegador
- O nome da pessoa saiu da sidebar. Empresa, senha e sair continuam no cabeçalho
- A aba ativa deixou de ser uma pílula. A direita ficou reta e as curvas côncavas passaram a ligar o branco ao conteúdo
- A faixa verde da borda direita saiu junto com a barra de rolagem que ocupava esse espaço
- A aba ativa passou a usar o cinza da página (`#F4F4F5`, token `brand.paper`)
- No primeiro item, a borda de cima fica reta na linha do cabeçalho e só a curva de baixo permanece
- As bolas decorativas saíram. O fundo da sidebar ficou só o verde
- O menu passou a rolar dentro da sidebar para Plano e Assinatura e Configurações aparecerem
- Uma única peça clara desliza até o item da rota, em 300 ms
- A cor do item troca junto com a peça, sem espera antes de começar
- No menu recolhido o ícone fica no centro do círculo, alinhado com os outros
- A peça clara encosta na borda na hora. Só a altura desliza
- No menu recolhido a curva voltou. A aba não passa mais da coluna verde, então a borda deixa de ser um corte reto
- O menu volta a deslizar. A aba clara acompanha a borda verde no mesmo instante, com a curva no canto

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/components/layouts/AppShell.tsx` — marca, recolhimento e navegação
- `frontend/src/styles/globals.css` — fundo, círculos, aba ativa e recolhimento

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- As curvas usam um degradê radial no canto, sem imagem e sem sombra. A sombra anterior deixava pontas brancas
- A aba não desliza entre itens. A troca de rota anima a cor no próprio item, para não falhar com alturas diferentes
- No celular o menu continua em cima da página, sem virar gaveta. O botão de recolher aparece no desktop
- A rolagem do menu continua no mouse, sem barra visível, para a aba encostar no conteúdo
- A peça ativa é uma camada só, medida no link da rota. Ela não usa índice fixo
- A marca fica na faixa do cabeçalho. A navegação, com a curva, começa abaixo dele

## 🐛 Problemas encontrados e soluções

- A primeira curva usava sombra e ficava no canto errado, com pontas brancas → o canto passou a ser um degradê radial acima e abaixo da aba
- A faixa verde era a barra de rolagem na borda direita → a rolagem ficou sem barra visível

## 📌 Pendências / próximos passos

- —
