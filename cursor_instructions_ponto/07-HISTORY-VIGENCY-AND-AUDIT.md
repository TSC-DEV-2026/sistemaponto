# Histórico, Vigência e Auditoria — {{PROJECT_NAME}}

## 1. Objetivo

O sistema deve preservar a trajetória das informações relevantes.

Não sobrescrever silenciosamente dados que possuem efeito histórico.

---

## 2. Histórico funcional

Responde:

> O que valia naquela data?

Exemplo:

```text
Cargo

01/01/2025 → 31/07/2026
Assistente Administrativo

01/08/2026 → atual
Analista Administrativo
```

---

## 3. Informações com histórico esperado

Considerar histórico/vigência para:

- cargo;
- jornada;
- centro de custo;
- unidade;
- setor;
- equipe;
- sindicato;
- gestor;
- situação do funcionário;
- outras informações com efeito temporal.

---

## 4. Jornada

Exemplo:

```text
01/01/2026 → 31/08/2026
08:00–12:00 / 13:00–18:00

01/09/2026 → atual
07:30–12:00 / 13:00–17:30
```

Ao consultar agosto, usar a jornada anterior.

Ao consultar setembro, usar a jornada vigente.

---

## 5. Histórico dentro do funcionário

Preferência de UX:

```text
Pessoas
  ↓
Funcionário
  ↓
Histórico
```

O histórico pode organizar alterações por categoria e/ou linha do tempo.

---

## 6. Histórico de ponto

Preservar rastreabilidade de:

- marcações;
- ajustes;
- abonos;
- atestados;
- ocorrências;
- solicitações;
- decisões.

Não destruir a evidência anterior quando houver correção.

Na correção de marcação, a marcação anterior deixa de valer e permanece no histórico. O registro deixa explícito se a alteração veio de solicitação aprovada ou foi manual.

---

## 7. Histórico de solicitação

Uma solicitação deve registrar sua evolução.

Exemplo:

```text
Criada
  ↓
Pendente
  ↓
Aprovada
```

ou:

```text
Criada
  ↓
Pendente
  ↓
Recusada
```

ou:

```text
Criada
  ↓
Pendente
  ↓
Cancelada pelo funcionário
```

---

## 8. Histórico de fechamento

Um fechamento deve manter seus eventos relevantes.

Exemplos:

- fechado;
- cancelado, com motivo, permanecendo no histórico;
- reaberto, com motivo, devolvendo o mesmo período a aberto.

A conferência antes de fechar é norma de processo de quem fecha. Não é uma etapa gravada pelo sistema.

---

## 9. Auditoria

Auditoria responde:

> Quem realizou a ação?

Exemplo:

```text
01/09/2026 09:42

Usuário:
Maria Oliveira

Ação:
Alteração de jornada

Funcionário:
João da Silva

Anterior:
Administrativa A

Novo:
Administrativa B

Vigência:
01/09/2026
```

---

## 10. Histórico x Auditoria

### Histórico funcional

Serve para compreender a trajetória do dado.

### Auditoria

Serve para rastrear a ação administrativa.

Não tratar os dois conceitos como sinônimos.

---

## 11. Sidebar

Não criar módulo global de históricos apenas para expor dados funcionais.

Auditoria administrativa global pode existir dentro de Administração se houver necessidade futura, mas não é requisito para inflar a sidebar inicial.

---

## 12. Períodos fechados

Mudanças que afetem período fechado devem ser tratadas com cuidado.

Não permitir alteração silenciosa do passado fechado.

A correção desse período só ocorre depois que o gestor ou o administrador reabre, com motivo. O cancelamento também exige motivo e deixa o período cancelado no histórico.
