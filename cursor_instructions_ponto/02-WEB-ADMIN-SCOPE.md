# Escopo da Aplicação Web Administrativa — {{PROJECT_NAME}}

## 1. Papel da aplicação web

A aplicação web é a superfície de:

- gestão;
- administração;
- parametrização;
- conferência;
- aprovação;
- correção;
- fechamento;
- análise;
- relatórios;
- assinatura.

Nenhuma decisão futura deve mover funcionalidades de gestão para o app sem definição explícita.

---

## 2. Dashboard

O dashboard é uma central operacional.

Deve priorizar:

- eventos atuais;
- exceções;
- pendências;
- alertas;
- totais relevantes;
- ações rápidas.

Exemplos:

### Hoje

- funcionários trabalhando;
- ausentes;
- em férias;
- afastados.

### Ponto

- marcações realizadas;
- marcações esperadas;
- atrasos;
- faltas;
- saídas antecipadas;
- jornadas incompletas.

### Solicitações

- ajustes pendentes;
- abonos pendentes;
- atestados pendentes.

### Banco de Horas

- saldo positivo;
- saldo negativo;
- horas extras acumuladas;
- funcionários com saldo crítico.

### Fechamento

- período atual;
- pendências;
- funcionários conferidos;
- funcionários pendentes;
- status.

### Alertas

- inconsistências;
- excesso de jornada;
- intervalo irregular;
- pendência de aprovação;
- proximidade do limite do plano.

O dashboard não substitui relatórios detalhados.

---

## 3. Organização

Gerenciar:

- unidades;
- setores;
- equipes.

Mudanças relevantes devem respeitar histórico e vigência.

---

## 4. Pessoas

Gerenciar:

- funcionários;
- cargos;
- centros de custo.

O cadastro individual do funcionário deve concentrar a consulta contextual.

Exemplo de visão conceitual:

```text
Funcionário
├── Dados
├── Trabalho
├── Ponto
├── Ocorrências
└── Histórico
```

O histórico deve permitir visualizar mudanças de:

- cargo;
- jornada;
- centro de custo;
- unidade;
- setor;
- equipe;
- sindicato;
- gestor;
- situação.

---

## 5. Jornada e Ponto

A web deve permitir gestão de:

- jornadas;
- marcações;
- apuração;
- banco de horas, com quitação pelo gestor e lançamento manual de crédito ou débito.

A aplicação deve manter a separação conceitual:

```text
Jornada = previsto
Marcação = realizado
Apuração = resultado
```

---

## 6. Ajustes e Ocorrências

A web deve permitir tratar:

- ajustes de ponto;
- lançamento/correção de marcação;
- faltas;
- atestados;
- férias;
- abonos;
- afastamentos.

Ações administrativas devem possuir rastreabilidade.

A correção de marcação, feita por solicitação aprovada ou manualmente pelo administrador, deixa a marcação anterior sem validade e a mantém no histórico. A origem fica explícita: solicitação ou manual.

O gestor pode lançar manualmente, no ponto, abono, atestado, afastamento e férias. A origem também fica explícita: solicitação ou manual.

Quando houver motivo padronizado, o usuário deve selecioná-lo em vez de sempre digitar texto livre.

Observação complementar pode existir quando aplicável.

---

## 7. Solicitações

A web é a superfície principal para análise das solicitações enviadas pelo funcionário.

Estados mínimos:

```text
PENDENTE
APROVADA
RECUSADA
CANCELADA
```

A área de Solicitações deve funcionar como caixa de entrada operacional.

Exemplo:

```text
Solicitações
├── Todas
├── Pendentes
│   ├── Ajustes
│   ├── Abonos
│   ├── Atestados
│   ├── Afastamentos
│   └── Férias
├── Aprovadas
├── Recusadas
└── Canceladas
```

Quem aprova é só o gestor da equipe. Uma aprovação basta. O pedido não sobe para outra pessoa e, por enquanto, ninguém substitui o gestor ausente.

Ao aprovar:

- efetivar o efeito correspondente;
- atualizar a apuração quando necessário;
- preservar histórico;
- registrar responsável e momento da decisão;
- notificar o funcionário quando configurado.

Ao recusar:

- não modificar o ponto existente;
- registrar decisão;
- preservar histórico;
- notificar o funcionário quando configurado.

---

## 8. Fechamento

A sidebar deve possuir apenas:

`Fechamento do Ponto`

O gestor define o período, em geral o mês civil, e pode escolher outro intervalo. O fechamento é um passo. As regras de bloqueio, cancelamento e reabertura estão em `04-BUSINESS-RULES-AND-WORKFLOWS.md`.

A tela inicial deve apresentar os fechamentos já existentes e seus estados.

Exemplo:

```text
Ago/2026    Fechado
Jul/2026    Fechado
Jun/2026    Cancelado
Mai/2026    Fechado
```

Ao abrir um período, exibir suas informações contextualmente.

Possíveis áreas:

- Resumo
- Funcionários
- Pendências
- Ocorrências
- Aprovações
- Eventos

Não criar submenus desnecessários para cada etapa do fechamento.

---

## 9. Regras Trabalhistas

Gerenciar:

- sindicatos;
- convenções;
- acordos;
- feriados;
- regras de ponto.

Sindicato e convenção alteram as contas da apuração. Os padrões, quando não houver valor próprio, estão em `04-BUSINESS-RULES-AND-WORKFLOWS.md`.

Não inventar regras trabalhistas não documentadas.

---

## 10. Relatórios

Macrogrupos:

- Ponto
- Jornada
- Banco de Horas
- Ocorrências
- Gestão

O catálogo inicial tem um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão.

Relatórios são analíticos e históricos.

Dashboard é operacional.

---

## 11. Fiscal / Folha

Gerenciar:

- AFD, com exportação independente de período fechado e importação de marcação com origem própria;
- AEJ, exportado só de período fechado;
- exportação de totais para folha: horas trabalhadas, hora extra, adicional noturno, falta e saldo do banco.

Arquivo gerado de período cancelado ou reaberto precisa ser gerado de novo.

A experiência deve ficar fora do fluxo cotidiano do funcionário.

---

## 12. Administração

A área administrativa deve contemplar:

- Motivos
- Permissões e Acessos
- Plano e Assinatura
- Configurações

A sidebar deve permanecer enxuta.
