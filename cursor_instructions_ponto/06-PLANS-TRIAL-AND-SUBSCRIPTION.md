# Planos, Trial e Assinatura — {{PROJECT_NAME}}

## 1. Jornada comercial

```text
Visitante
  ↓
Site
  ↓
Cadastro
  ↓
Criação da empresa
  ↓
Trial
  ↓
Contratação
  ↓
Assinatura ativa
```

---

## 2. Trial

Regra atualmente definida:

- 7 dias;
- até 10 funcionários;
- todas as funcionalidades liberadas.

Objetivo:

permitir que a empresa teste o produto real sem limitação artificial de recursos.

Limitações do trial:

- tempo;
- quantidade de funcionários.

---

## 3. Plano por capacidade

A contratação é baseada em capacidade.

Blocos:

```text
10
20
30
40
50
...
100
...
200
```

O plano não representa necessariamente a quantidade exata cadastrada.

Exemplo:

```text
Capacidade contratada: 30
Funcionários ativos:   23
Disponível:              7
```

---

## 4. Upgrade

O administrador da conta pode aumentar a capacidade sem depender de atendimento manual.

Exemplos válidos:

```text
20 → 30
20 → 50
20 → 100
20 → 200
```

A unidade é múltiplo de 10, mas o usuário não precisa aumentar apenas um bloco por vez.

---

## 5. Limite

Quando a capacidade estiver próxima do limite, exibir aviso.

Exemplo:

```text
17 / 20
85%

Próximo do limite
```

Quando atingir:

```text
20 / 20

Limite atingido
```

Bloquear cadastro adicional que aumente o consumo de capacidade até que o plano seja ampliado ou haja redução de funcionários contabilizados.

---

## 6. Funcionários desligados

Funcionários desligados:

- permanecem no histórico;
- não devem consumir capacidade contratada permanentemente.

---

## 7. Downgrade

Regra conceitual:

```text
nova capacidade >= funcionários contabilizados
```

Exemplo:

```text
83 funcionários ativos

Pode reduzir:
100 → 90

Não pode:
100 → 80
```

O comportamento financeiro do downgrade ainda será definido.

---

## 8. Dashboard/avisos de plano

O administrador pode visualizar:

- plano atual;
- capacidade;
- utilização;
- vagas disponíveis;
- status do trial;
- dias restantes;
- próxima cobrança quando definida;
- alertas de limite.

---

## 9. Sidebar

Plano e Assinatura permanece em:

```text
ADMINISTRAÇÃO
└── Plano e Assinatura
```

Não transformar planos em módulo operacional.

---

## 10. Decisões ainda abertas

Não assumir sem definição explícita:

- preço por bloco;
- mensal vs anual;
- pró-rata;
- cobrança imediata em upgrade;
- vigência de downgrade;
- comportamento de inadimplência;
- métodos de pagamento;
- comportamento definitivo ao fim do trial.

Possibilidades identificadas para fim do trial:

- bloqueio total;
- somente leitura;
- período de tolerância.

Nenhuma delas está definitivamente aprovada.
