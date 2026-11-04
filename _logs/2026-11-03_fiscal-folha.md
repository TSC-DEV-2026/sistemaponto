# Log — visual de Fiscal / Folha

**Data:** 2026-11-03  
**Sessão:** acesso do funcionário e redesign da área de conteúdo de Fiscal / Folha

---

## ✅ O que foi feito

- Funcionário (papel membro) deixa de ver Fiscal / Folha no menu. Se abrir o endereço, volta para o início.
- Administrador e gestor continuam entrando. Consultar os totais continua só com o administrador.
- A aba AFD ficou com gerar, importar e arquivos gerados em cards separados, na largura do conteúdo. O título fica em cima e os campos na linha de baixo.
- A escolha do arquivo .txt usa o mesmo campo de upload do atestado e da foto de referência. A importação começa ao selecionar o arquivo. O botão Importar saiu.
- A aba Totais da folha segue o mesmo card. Antes da consulta, a área mostra o estado vazio. O resultado fica em tabela no desktop e em cards no celular.
- Abas na cápsula já aprovada. Rótulos acima dos campos. Vazio com texto. Carregamento com spinner.

## 📁 Arquivos criados

- `_logs/2026-11-03_fiscal-folha.md` — registro desta sessão.

## ✏️ Arquivos modificados

- `frontend/src/navigation.ts` — o item do menu ficou restrito a administrador e gestor.
- `frontend/src/pages/workforce/OperationsPages.tsx` — bloqueio da página e visual das duas abas.

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A faixa verde do pedido não entrou. A frase do período cancelado ficou no subtítulo de Arquivos gerados.
- As abas seguem a cápsula, não o botão verde sólido.
- Geração, importação, filtros, download e consulta usam os mesmos contratos. Nada de API, cálculo ou arquivo fiscal foi alterado.

## 🧪 Como testar

1. Entrar como funcionário e conferir que Fiscal / Folha não aparece. Abrir `/payroll` deve voltar ao início.
2. Entrar como administrador, alternar AFD e Totais da folha, gerar, importar um .txt e filtrar tipo e validade.
3. Consultar um mês e conferir trabalhado, extra, noturno, falta e banco, inclusive saldo negativo.
4. Entrar como gestor: gera arquivo, e não vê o botão de consultar totais.

## ❗ Problemas encontrados

- O navegador isolado não entra no sistema local. A conferência visual logada ficou com quem usa a tela.
- Não rodei geração nem importação de arquivo real, para não gravar dado fiscal.
