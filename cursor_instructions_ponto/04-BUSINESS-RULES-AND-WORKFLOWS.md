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

Uma aprovação basta. Quem aprova é só o gestor da equipe. O pedido não sobe para outra pessoa. Se o gestor está ausente, ninguém substitui por enquanto.

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

O gestor também pode lançar o abono manualmente no ponto, sem solicitação. A origem fica explícita: solicitação ou manual.

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

Somente após aprovação do gestor da equipe o atestado produz efeito.

Antes de aceitar, o sistema confere se já existem marcações no período. O atestado entra mesmo assim. Se houver conflito, o ponto mostra o aviso "período abonado conflita com registro de ponto".

O documento fica visível só para o solicitante e para o gestor da equipe.

O gestor também pode lançar o atestado manualmente no ponto. A origem fica explícita: solicitação ou manual.

---

## 5. Afastamento e férias

Afastamento e férias podem ser solicitados pelo funcionário e aceitos pelo gestor da equipe.

O gestor também pode lançar os dois manualmente no ponto. A origem fica explícita: solicitação ou manual.

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

O saldo é contínuo. Ele acumula de um mês para o outro até o gestor quitar.

Não há limite de saldo.

O prazo para expirar é configurável. O padrão é de 6 em 6 meses. Neste corte o efeito é o aviso "Saldo irá expirar em x dias".

Quem quita é o gestor. A quitação pode ser parcial e pode ocorrer a qualquer momento, também fora do fechamento. O padrão é pagar o valor quitado como hora extra. Se o saldo quitado está negativo, o padrão é descontar como falta.

O gestor também pode lançar crédito ou débito manual no banco. Esse lançamento não depende do fechamento nem do aviso de expiração.

---

## 10. Fechamento

O fechamento consolida um período.

Antes do fechamento devem poder existir:

- conferência;
- pendências;
- correções;
- solicitações;
- aprovações;
- ocorrências.

Após fechamento, qualquer alteração posterior deve respeitar regra específica de reabertura/cancelamento, a ser detalhada.

Não permitir que mudanças silenciosas alterem retroativamente um período fechado sem workflow explícito.

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

Quem aprova solicitação de ajuste, abono, atestado, afastamento e férias é só o gestor da equipe. Uma aprovação basta. O pedido não sobe e, por enquanto, ninguém substitui o gestor ausente.

O administrador corrige marcação manualmente, com a mesma regra do ajuste aprovado. O gestor lança manualmente abono, atestado, afastamento e férias. Nos dois casos a origem fica explícita: solicitação ou manual.

O gestor quita o banco de horas e lança crédito ou débito manual no saldo. O funcionário não faz essas ações.

Não assumir que permissão é apenas um booleano global.

---

## 14. Notificações

Eventos candidatos:

- nova solicitação;
- solicitação aprovada;
- solicitação recusada;
- solicitação cancelada;
- atestado recebido;
- ponto incompleto;
- pendência de fechamento;
- fechamento próximo;
- trial terminando;
- limite do plano próximo;
- limite do plano atingido.

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
