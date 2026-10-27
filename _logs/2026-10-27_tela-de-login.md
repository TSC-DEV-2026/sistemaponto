# Log — tela de login

**Data:** 2026-10-27  
**Sessão:** novo visual da tela de login

---

## ✅ O que foi feito

- A tela de login passou a ocupar a viewport em duas metades: esquerda cinza e vazia, direita com o card de entrada
- O card segue o desenho aprovado: identificação sistemaponto, título, CPF, senha, botão verde, divisão "ou" e os links já existentes
- Máscara de CPF, envio, sessão, recuperação de senha e criação de conta permaneceram os mesmos
- O carregamento do login fica no spinner do botão. A barra do topo não aparece nesse envio

## 📁 Arquivos criados

- —

## ✏️ Arquivos modificados

- `frontend/src/pages/LoginPage.tsx` — layout, card e estados visuais da entrada
- `frontend/tailwind.config.js` — tokens da paleta usados só por essa tela
- `frontend/src/services/auth.service.ts` — o POST de login não aciona a barra de progresso

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A página deixou de usar `PublicFrame` para não alterar cadastro, esqueci a senha e as outras telas públicas
- Campos, botão e formulário continuam os componentes que já existiam. O visual novo está nas classes da própria página
- "ponto" usa `#1E8A3A`. `#C6E824` é o verde de marca, mas em texto de 16 px sobre branco não tem contraste suficiente. O verde da imagem também é o verde de ação, não o chartreuse
- Abaixo de 768 px a faixa cinza some. De 768 px para cima as duas colunas permanecem e o card encolhe até a largura da coluna

## 🐛 Problemas encontrados e soluções

- O `px-3` do input compartilhado disputava o espaço do ícone com `pl-11`. O campo da página usa `!pl-11`, e a senha usa `!pr-10`, para o texto não ficar sob o olho

## 📌 Pendências / próximos passos

- Entrar com credencial válida e conferir o redirecionamento não foi executado aqui: não há conta de teste documentada. O caminho de sucesso do formulário não foi alterado
- Conteúdo institucional da faixa esquerda continua de fora, como pedido
