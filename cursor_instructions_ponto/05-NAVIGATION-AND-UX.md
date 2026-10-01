# Navegação e UX — {{PROJECT_NAME}}

## 1. Sidebar base

A sidebar aprovada conceitualmente é:

```text
📊 Dashboard

OPERAÇÃO
├── ⏰ Jornada e Ponto
├── 📱 Registro de Ponto
├── 📝 Ajustes e Ocorrências
├── 📥 Solicitações
└── 🔒 Fechamento do Ponto

GESTÃO
├── 👥 Pessoas
├── 📊 Relatórios
└── 🔔 Notificações

ORGANIZAÇÃO
├── 🏢 Estrutura Organizacional
└── 📜 Regras Trabalhistas

INTEGRAÇÕES
└── 🧾 Fiscal / Folha

ADMINISTRAÇÃO
├── 🏷️ Motivos
├── 🔐 Permissões e Acessos
├── 💳 Plano e Assinatura
└── ⚙️ Configurações
```

Não adicionar novos itens principais sem necessidade real.

---

## 2. Regra de navegação

Princípio:

> A sidebar leva ao domínio.  
> O histórico fica dentro do contexto daquele domínio.

Exemplo correto:

```text
Pessoas
  ↓
Funcionários
  ↓
João da Silva
  ↓
Histórico
```

Evitar:

```text
Histórico
├── Cargos
├── Jornadas
├── Centros de Custo
├── Setores
└── Equipes
```

---

## 3. Fechamento

`Fechamento do Ponto` deve abrir uma visão consolidada de períodos.

Não criar necessariamente:

- submenu Conferência;
- submenu Pendências;
- submenu Aprovação;
- submenu Histórico.

Essas informações pertencem ao fechamento selecionado.

---

## 4. Solicitações

A área deve funcionar como caixa de entrada.

Exemplo conceitual:

```text
Solicitações                    19

Todas                           19

Pendentes                       12
├── Ajustes                      6
├── Abonos                       3
└── Atestados                    3

Aprovadas
Recusadas
Canceladas
```

O badge de quantidade deve ser útil para o gestor identificar trabalho pendente.

---

## 5. Dashboard

O dashboard deve privilegiar ação.

Evitar painel composto apenas por métricas decorativas.

Exemplo melhor:

```text
12 solicitações pendentes
6 ajustes
3 abonos
3 atestados
[Revisar]
```

em vez de apenas:

```text
12 solicitações
```

---

## 6. Cadastro do funcionário

A experiência deve favorecer contexto.

Exemplo:

```text
João da Silva

Dados | Trabalho | Ponto | Ocorrências | Histórico
```

A organização exata de abas pode variar conforme o design existente, mas a lógica contextual deve ser preservada.

---

## 7. Web x App

### Web

Gestão e administração.

### App

Registro e autosserviço.

Evitar duplicar integralmente a experiência web no app.

---

## 8. Poluição visual

Evitar:

- sidebar excessivamente longa;
- cada workflow como item de menu;
- cada estado como submenu;
- cada histórico como módulo;
- duplicação de conceito em vários lugares.

Preferir:

- filtros;
- abas contextuais;
- drawers/modais quando apropriado;
- cards acionáveis;
- navegação por domínio.
