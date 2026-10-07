# Cursor Master Instructions — {{PROJECT_NAME}}

> Substituir `{{PROJECT_NAME}}` pelo nome definitivo do produto quando ele for escolhido.

## Objetivo deste documento

Este documento orienta o Cursor a trabalhar no produto `{{PROJECT_NAME}}` preservando as decisões funcionais já definidas.

O foco deste material é **produto, comportamento, regras de negócio, fluxos e experiência**.

A stack tecnológica, frameworks, linguagem, arquitetura física e infraestrutura já estão definidas no workspace e **não devem ser reinventadas por estas instruções**.

---

## 1. Regra principal de trabalho

Antes de alterar qualquer parte do projeto:

1. Ler o workspace completo relacionado à demanda.
2. Ler todos os documentos `.md` existentes que definam arquitetura, convenções, regras e decisões anteriores.
3. Identificar a arquitetura e os padrões já utilizados.
4. Localizar implementações semelhantes antes de criar novas abstrações.
5. Preservar o comportamento existente que não faça parte da demanda.
6. Não refatorar partes não relacionadas apenas por preferência pessoal.
7. Alterar somente o necessário.
8. Evitar regressões.
9. Registrar em documentação as novas decisões funcionais relevantes.
10. Quando houver ambiguidade entre código existente e esta documentação, parar a implementação conceitualmente, comparar os dois contextos e apontar a divergência antes de assumir comportamento.

---

## 2. Separação funcional obrigatória

O produto possui duas superfícies principais:

### Web administrativo

Toda a gestão é realizada via web.

Exemplos:

- dashboard;
- organização;
- funcionários;
- cargos;
- centros de custo;
- jornadas;
- apuração;
- banco de horas;
- ajustes;
- ocorrências;
- solicitações;
- aprovações;
- fechamento do ponto;
- regras trabalhistas;
- relatórios;
- notificações;
- permissões;
- plano e assinatura;
- configurações;
- fiscal e folha.

A aplicação web é a superfície de **administração, gestão, conferência, análise e decisão**.

### App do funcionário

O app é a superfície de **registro e autosserviço do funcionário**.

Exemplos:

- registrar ponto;
- visualizar o próprio ponto;
- visualizar a própria jornada;
- consultar saldo de banco de horas;
- visualizar ocorrências próprias quando permitido;
- criar solicitações;
- enviar atestado;
- solicitar abono;
- solicitar ajuste de ponto;
- acompanhar status de solicitações;
- receber notificações relacionadas ao próprio vínculo.

O app **não é uma ferramenta de gestão**.

Não criar no app, sem decisão explícita futura:

- gestão de equipe;
- aprovação de solicitações;
- ajustes administrativos;
- fechamento;
- gestão de pessoas;
- configuração de jornadas;
- relatórios gerenciais;
- administração de permissões;
- administração de planos.

---

## 3. Projeto `clockup` como referência

Existe no workspace um projeto chamado `clockup`.

A forma de registro de ponto já implementada nele pode e deve ser estudada como **inspiração funcional e comportamental**.

Ao implementar ou revisar funcionalidades de registro de ponto:

1. localizar o projeto `clockup`;
2. estudar o fluxo de registro;
3. entender validações, estados e comportamento;
4. reaproveitar conceitos válidos;
5. preservar as decisões atuais do novo produto;
6. não copiar código cegamente;
7. não assumir que arquitetura, nomenclatura, persistência ou organização interna do `clockup` sejam obrigatórias;
8. usar o `clockup` como referência de experiência e comportamento, não como especificação absoluta.

---

## 4. Princípios de produto

As seguintes regras são estruturais:

### 4.1. Registro não é apuração

- registro/marcação representa o que aconteceu;
- jornada representa o que deveria acontecer;
- apuração representa o resultado da comparação entre marcações, jornada, calendário e regras aplicáveis.

### 4.2. Solicitação não altera o ponto

Uma solicitação criada pelo funcionário:

- nasce pendente;
- não modifica o ponto;
- somente uma aprovação do gestor da equipe efetiva a alteração;
- não há segundo aprovador, escalonamento nem substituto;
- uma recusa preserva o ponto original;
- uma solicitação cancelada pelo funcionário também não altera o ponto.

### 4.3. Histórico não deve ser perdido

Alterações relevantes devem preservar histórico e vigência.

Exemplos:

- cargo;
- jornada;
- centro de custo;
- unidade;
- setor;
- equipe;
- sindicato;
- gestor;
- situação do funcionário;
- ajustes;
- solicitações;
- fechamento.

### 4.4. Sidebar não deve ser poluída

Históricos contextuais devem ficar dentro dos próprios domínios.

Exemplo:

`Pessoas > Funcionário > Histórico`

e não:

`Histórico > Cargos`, `Histórico > Jornadas`, etc.

### 4.5. Dashboard é operacional

Dashboard deve responder:

- o que está acontecendo;
- onde há problemas;
- o que exige atenção;
- o que precisa de ação.

Dashboard não substitui relatórios.

---

## 5. Escopo macro

Consultar os documentos complementares deste pacote:

- `01-PRODUCT-VISION-AND-SCOPE.md`
- `02-WEB-ADMIN-SCOPE.md`
- `03-MOBILE-APP-SCOPE.md`
- `04-BUSINESS-RULES-AND-WORKFLOWS.md`
- `05-NAVIGATION-AND-UX.md`
- `06-PLANS-TRIAL-AND-SUBSCRIPTION.md`
- `07-HISTORY-VIGENCY-AND-AUDIT.md`
- `08-OPEN-DECISIONS-AND-GUARDRAILS.md`

---

## 6. Regra para novas funcionalidades

Sempre que uma nova funcionalidade for criada ou alterada, avaliar:

- qual domínio ela pertence;
- quem pode consultar;
- quem pode alterar;
- se possui vigência;
- se precisa de histórico;
- se exige motivo;
- se exige observação;
- se pode ser cancelada;
- se pode ser revertida;
- se exige aprovação;
- se gera notificação;
- se interfere em período já fechado;
- se aparece na web, no app ou em ambos;
- se altera a apuração;
- se altera banco de horas;
- se altera folha/fiscal;
- se precisa aparecer no dashboard;
- se precisa aparecer em relatório.

Não assumir respostas silenciosamente quando a decisão ainda estiver marcada como aberta na documentação.
