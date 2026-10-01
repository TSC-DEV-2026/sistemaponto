# Regras de Negócio e Workflows — {{PROJECT_NAME}}

## 1. Registro, Jornada e Apuração

### Jornada

Representa o previsto.

### Marcação

Representa o ocorrido.

### Apuração

Representa o resultado.

A apuração deve considerar, conceitualmente:

- jornada;
- marcações;
- calendário;
- regras aplicáveis;
- ocorrências;
- ajustes efetivados.

Não tratar uma marcação como resultado final da jornada.

---

## 2. Solicitação de Ajuste

Fluxo:

```text
Funcionário
  ↓
Solicita ajuste
  ↓
Pendente
  ↓
Gestor/RH analisa
  ├── Aprovar
  │     ↓
  │  Efetiva alteração
  │     ↓
  │  Reavalia apuração quando necessário
  │
  └── Recusar
        ↓
     Mantém ponto original
```

Regra obrigatória:

**solicitação pendente não altera o ponto.**

---

## 3. Solicitação de Abono

Fluxo equivalente:

```text
Funcionário solicita
  ↓
Pendente
  ↓
Gestor/RH analisa
  ├── Aprova → efetiva
  └── Recusa → não altera situação existente
```

---

## 4. Envio de Atestado

O envio de um atestado pelo funcionário é uma solicitação/documento pendente de análise.

Não confundir:

```text
Documento enviado
```

com:

```text
Atestado validado/efetivado
```

Somente após aprovação deve produzir o efeito definido para o ponto.

---

## 5. Cancelamento de solicitação

Quando permitido, o funcionário pode cancelar uma solicitação ainda pendente.

Estado:

`CANCELADA`

Cancelamento:

- não altera ponto;
- preserva histórico;
- deve ficar visível no histórico da solicitação.

---

## 6. Motivos padronizados

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

## 7. Falta

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

## 8. Fechamento

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

## 9. Histórico

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

## 10. Funcionário desligado

O histórico do funcionário permanece.

Para plano/assinatura, funcionário desligado não deve consumir capacidade contratada de forma permanente.

---

## 11. Permissões

Permissão deve considerar:

- ação;
- domínio;
- escopo.

Exemplo:

```text
Gestor pode aprovar ajustes
somente da própria equipe.
```

Não assumir que permissão é apenas um booleano global.

---

## 12. Notificações

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

## 13. Checklist obrigatória para cada regra nova

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
