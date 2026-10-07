# Regras de Negócio e Workflows — {{PROJECT_NAME}}

## 1. Registro, Jornada e Apuração

### Jornada

Representa o previsto.

### Marcação

Representa o ocorrido.

### Apuração

Representa o resultado.

A apuração deve considerar:

- jornada;
- marcações que ainda valem;
- calendário;
- regras aplicáveis;
- ocorrências;
- ajustes efetivados.

Não tratar uma marcação como resultado final da jornada.

Neste corte a única escala é a 5x2.

Os padrões abaixo valem quando sindicato ou convenção não trouxer outro valor. Sindicato e convenção alteram essas contas.

### Tolerância

A tolerância é configurável. O padrão é 10 minutos.

Atraso dentro da tolerância conta como horário previsto. Atraso acima da tolerância desconta o atraso inteiro, não só o excedente.

### Saída antecipada

A saída antecipada desconta o tempo.

### Intervalo

A duração mínima do intervalo é 1 hora. Se o intervalo feito for menor do que o previsto, o ponto mostra o aviso "intervalo menor do que o previsto". A marcação permanece.

### Hora extra e adicional noturno

Trabalhar acima da quantidade prevista gera hora extra. Exemplo: a escala determina 08:48 e o trabalho foi 09:18, então são 30 minutos.

O único adicional deste corte é o noturno. O período é configurável. O padrão vai das 22:00, entrada do dia 1, às 05:00, saída do dia 2. O acréscimo é configurável e o padrão é 20%. Ele incide só nas horas trabalhadas dentro desse horário. Esses minutos não entram no saldo do banco de horas.

### Feriado

O feriado é dia sem trabalho, por padrão. Se houver trabalho no feriado, todo o período trabalhado vira hora extra.

### Falta e abono

A apuração pode detectar falta. O abono aprovado, quando havia falta, marca o dia sem falta, porque houve justificativa para não trabalhar.

---

## 2. Solicitação de Ajuste

O pedido traz as marcações do dia.

Fluxo:

```text
Funcionário
  ↓
Solicita ajuste
  ↓
Pendente
  ↓
Gestor da equipe analisa
  ├── Aprovar
  │     ↓
  │  As marcações novas passam a valer
  │     ↓
  │  As marcações antigas deixam de valer e permanecem no histórico
  │     ↓
  │  Reavalia apuração
  │
  └── Recusar
        ↓
     Mantém ponto original
```

Regra obrigatória:

**solicitação pendente não altera o ponto.**

A marcação que deixa de valer não é apagada.

A correção manual feita pelo administrador segue a mesma regra. A origem fica explícita: solicitação ou manual.

Uma aprovação basta. Quem aprova é o gestor da equipe ou o administrador. O pedido não sobe para outra pessoa. Se o gestor está ausente, ninguém substitui por enquanto.

---

## 3. Solicitação de Abono

Abono é folga justificada.

Fluxo:

```text
Funcionário solicita
  ↓
Pendente
  ↓
Gestor da equipe analisa
  ├── Aprova → se havia falta, o dia fica sem falta
  └── Recusa → não altera situação existente
```

O gestor e o administrador também podem lançar o abono manualmente no ponto, sem solicitação. A origem fica explícita: solicitação ou manual.

---

## 4. Envio de Atestado

Há um tipo só de atestado.

O funcionário informa:

- período, em dia inteiro, em algumas horas ou em vários dias;
- CID;
- CRM;
- nome do médico;
- foto, opcional neste corte;
- motivo, quando houver catálogo;
- observação, quando aplicável.

O envio é uma solicitação pendente de análise.

Não confundir:

```text
Documento enviado
```

com:

```text
Atestado validado/efetivado
```

Somente após aprovação do gestor da equipe ou do administrador o atestado produz efeito.

Antes de aceitar, o sistema confere se já existem marcações no período. O atestado entra mesmo assim. Se houver conflito, o ponto mostra o aviso "período abonado conflita com registro de ponto".

O documento fica visível para o solicitante, para o gestor da equipe e para o administrador.

O gestor e o administrador também podem lançar o atestado manualmente no ponto. A origem fica explícita: solicitação ou manual.

---

## 5. Afastamento e férias

Afastamento e férias podem ser solicitados pelo funcionário e aceitos pelo gestor da equipe ou pelo administrador.

O gestor e o administrador também podem lançar os dois manualmente no ponto. A origem fica explícita: solicitação ou manual.

Não há planejamento de férias neste corte.

---

## 6. Cancelamento de solicitação

Quando permitido, o funcionário pode cancelar uma solicitação ainda pendente.

Estado:

`CANCELADA`

Cancelamento:

- não altera ponto;
- preserva histórico;
- deve ficar visível no histórico da solicitação.

---

## 7. Motivos padronizados

A empresa pode criar catálogo de motivos.

Tipos inicialmente previstos:

- Ajustes
- Faltas
- Abonos
- Atestados

Exemplo:

```text
Motivo:
Esquecimento de marcação

Aplicável em:
Ajuste

Status:
Ativo
```

Permitir observação complementar quando aplicável.

Evitar exigir digitação integral do motivo em cada lançamento.

---

## 8. Falta

Não confundir:

1. falta detectada pela apuração;
2. falta registrada como ocorrência;
3. justificativa/solicitação criada pelo funcionário.

Conceito recomendado:

```text
Apuração detecta
  ↓
Ocorrência representa
  ↓
Solicitação pode justificar/regularizar
```

---

## 9. Banco de horas

O uso do banco é uma escolha.

Com banco:

- trabalhar acima do previsto soma no saldo;
- trabalhar abaixo do previsto compensa o saldo.

Sem banco:

- trabalhar acima do previsto gera hora extra;
- trabalhar abaixo do previsto gera falta, com desconto.

Exemplo de crédito: a escala determina 08:48 e o trabalho foi 09:18, então entram 30 minutos no saldo.

Exemplo de débito: a escala determina 08:48 e o trabalho foi 08:18, então saem 30 minutos do saldo.

O saldo é contínuo. Ele acumula de um mês para o outro até o gestor ou o administrador quitar.

Não há limite de saldo.

O prazo para expirar é configurável. O padrão é de 6 em 6 meses. Neste corte o efeito é o aviso "Saldo irá expirar em x dias".

Quem quita é o gestor ou o administrador. A quitação pode ser parcial e pode ocorrer a qualquer momento, também fora do fechamento. O padrão é pagar o valor quitado como hora extra. Se o saldo quitado está negativo, o padrão é descontar como falta.

O gestor e o administrador também podem lançar crédito ou débito manual no banco. Esse lançamento não depende do fechamento nem do aviso de expiração.

---

## 10. Fechamento

O gestor ou o administrador define o período e o fecha num passo só. Não há etapa de sistema chamada conferido ou aprovado. Por norma de processo, quem fecha confere os pontos antes.

O período não é fixo. Em geral é o mês civil, e pode ser qualquer intervalo.

O fechamento não ocorre quando existe:

- solicitação pendente;
- ponto incompleto;
- conflito entre abono ou atestado e marcação registrada.

O aviso de intervalo menor do que o previsto não impede o fechamento.

No dia de trabalho da escala 5x2, o ponto está completo quando a quantidade de marcações é par. Quantidade ímpar é ponto incompleto.

Não entram nessa conta:

- feriado;
- férias;
- afastamento;
- abono do dia inteiro;
- atestado do dia inteiro.

Atraso, saída antecipada e intervalo menor não são ponto incompleto.

Depois de fechado, ficam bloqueados no período:

- marcação;
- ajuste;
- ocorrência;
- vigência;
- quitação do banco;
- lançamento manual de crédito ou débito no banco.

Correção de período fechado só ocorre depois de reabrir.

O gestor ou o administrador cancela o fechamento e informa o motivo. O período fica cancelado no histórico.

O gestor ou o administrador reabre o fechamento, informa o motivo, e o mesmo período volta a aberto.

Não permitir que mudanças silenciosas alterem um período fechado.

### Arquivos fiscais

A exportação de AFD não depende de período fechado.

A importação de AFD cria marcação com origem própria, distinta da marcação do funcionário e da marcação do administrador. Se a marcação importada já existe, só ela é ignorada e as demais seguem.

A exportação de AEJ sai só de período fechado.

A exportação de totais para a folha leva, neste corte:

- horas trabalhadas;
- hora extra;
- adicional noturno;
- falta;
- saldo do banco.

Se o período for cancelado ou reaberto, o arquivo já gerado deixa de valer e precisa ser gerado de novo.

---

## 11. Histórico

Alterações relevantes não devem apagar o passado.

Exemplo:

```text
Jornada A
01/01/2026 até 31/08/2026

Jornada B
01/09/2026 até atual
```

Ao consultar agosto, considerar Jornada A.

Ao consultar setembro, considerar Jornada B.

---

## 12. Funcionário desligado

O histórico do funcionário permanece.

Para plano/assinatura, funcionário desligado não deve consumir capacidade contratada de forma permanente.

---

## 13. Permissões

Permissão deve considerar:

- ação;
- domínio;
- escopo.

Quem aprova solicitação de ajuste, abono, atestado, afastamento e férias é o gestor da equipe ou o administrador. Uma aprovação basta. O pedido não sobe e, por enquanto, ninguém substitui o gestor ausente. O gestor decide a própria equipe e não decide a própria solicitação. O administrador pode decidir em qualquer equipe.

O administrador corrige marcação manualmente, com a mesma regra do ajuste aprovado. O gestor e o administrador lançam manualmente abono, atestado, afastamento e férias. A origem fica explícita: solicitação ou manual.

O gestor e o administrador quitam o banco de horas e lançam crédito ou débito manual no saldo. O funcionário não faz essas ações. Dentro de período fechado, quitação e lançamento manual ficam bloqueados até a reabertura.

O gestor e o administrador fecham, cancelam e reabrem o período. Cancelamento e reabertura exigem motivo.

Não assumir que permissão é apenas um booleano global.

---

## 14. Notificações

Os canais deste corte são o aviso dentro do sistema e o e-mail. O texto é o mesmo nos dois. A pessoa pode desligar cada aviso. O envio é diário. A frequência poderá ser customizada no futuro.

Frases:

- nova solicitação: "Há uma nova solicitação para analisar.";
- solicitação aprovada: "Sua solicitação foi aprovada.";
- solicitação recusada: "Sua solicitação foi recusada.";
- solicitação cancelada: "Sua solicitação foi cancelada.";
- atestado recebido: "Há um atestado recebido para analisar.";
- ponto incompleto: "Há um dia com quantidade ímpar de marcações.";
- pendência de fechamento: "Há pendência impedindo o fechamento.";
- fechamento próximo, a partir de 3 dias antes: "O fechamento do período ocorre em 3 dias.";
- trial terminando, a partir de 3 dias antes: "O período de teste termina em 3 dias. Contrate um plano.";
- limite do plano próximo: "A capacidade de funcionários está próxima do limite.";
- limite do plano atingido: "A capacidade de funcionários foi atingida."

---

## 15. Checklist obrigatória para cada regra nova

Ao implementar uma nova regra, verificar:

- vigência;
- histórico;
- permissão;
- escopo;
- motivo;
- observação;
- aprovação;
- cancelamento;
- reversão;
- impacto em apuração;
- impacto em fechamento;
- notificação;
- visibilidade web/app.
