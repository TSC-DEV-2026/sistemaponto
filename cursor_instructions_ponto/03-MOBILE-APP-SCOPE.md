# Escopo do App do Funcionário — {{PROJECT_NAME}}

## 1. Papel do app

O app é voltado ao funcionário.

Objetivos:

- registrar ponto;
- consultar informações próprias;
- solicitar correções ou justificativas;
- acompanhar solicitações;
- receber notificações.

O app **não é uma ferramenta de gestão**.

---

## 2. Registro de Ponto

Modalidades deste corte:

- Registro Simples
- QR Code + Selfie
- Reconhecimento Facial
  - Online
  - Offline

### Registro Simples

É um botão no app. O funcionário clica e a marcação é registrada.

### QR Code + Selfie

O QR Code é gerado com unidade, CPF e matrícula.

A marcação só ocorre quando o QR Code e a selfie são aceitos. Se um dos dois falha, o ponto não é marcado e a pessoa pode tentar de novo.

### Reconhecimento Facial

Vale online e offline.

A marcação só ocorre quando o rosto é reconhecido. Se o reconhecimento falha, o ponto não é marcado e a pessoa pode tentar de novo.

O projeto `clockup` deve ser estudado como referência para o fluxo já implementado de registro de ponto.

Usar como inspiração:

- experiência de registro;
- mensagens ao usuário;
- comportamento durante o registro;
- estados;
- validações funcionais;
- tratamento de situações comuns.

Não assumir que toda decisão do `clockup` deve ser copiada.

---

## 3. Consulta do próprio ponto

O funcionário deve poder consultar seu próprio ponto.

A experiência deve permitir compreender:

- data;
- jornada prevista;
- marcações;
- situação da jornada;
- ocorrências próprias quando permitido;
- ajustes efetivados;
- solicitações relacionadas.

Não permitir visualização de dados de outros funcionários.

---

## 4. Consulta da própria jornada

O funcionário deve conseguir visualizar a jornada que lhe é aplicável.

Quando houver mudanças históricas, a consulta deve respeitar o período.

---

## 5. Banco de Horas

O app pode permitir consulta do próprio banco de horas.

Exibir de forma simples:

- saldo atual, contínuo de um mês para o outro;
- créditos;
- débitos;
- aviso de expiração, quando o prazo estiver próximo.

O saldo não tem limite. O prazo de expiração é configurável e o padrão é de 6 em 6 meses. Neste corte o efeito do prazo é o aviso, no formato "Saldo irá expirar em x dias".

O adicional noturno não entra nos minutos desse saldo. Nenhuma gestão de banco de horas deve ser feita pelo funcionário via app. A quitação e o lançamento manual de crédito ou débito ficam com o gestor, na web.

---

## 6. Solicitações

O funcionário deve poder criar solicitações.

Tipos que o funcionário pode solicitar:

- ajuste de ponto;
- abono (folga);
- atestado;
- afastamento;
- férias.

A solicitação nasce pendente e não altera o ponto até a aprovação. Uma aprovação do gestor da equipe basta. Não há segundo aprovador, escalonamento nem substituto.

### Ajuste de Ponto

O pedido traz as marcações do dia, não uma marcação isolada.

Exemplo:

```text
Data
31/08/2026

Marcações do dia
08:02
12:01
13:00
18:03

Motivo
Esquecimento de marcação

Observação
Esqueci de registrar a saída
```

Regra:

- enviar solicitação;
- não alterar o ponto;
- aguardar decisão.

### Abono

O funcionário pode solicitar abono. A solicitação não efetiva o abono até aprovação.

### Atestado

Há um tipo só de atestado.

Permitir:

- informar período, em dia inteiro, em algumas horas ou em vários dias;
- preencher CID, CRM e nome do médico;
- anexar foto, opcional neste corte;
- selecionar motivo quando aplicável;
- adicionar observação;
- enviar para análise.

O envio não significa aprovação. O documento fica visível só para o solicitante e para o gestor da equipe.

### Afastamento e férias

O funcionário pode solicitar afastamento e férias. A solicitação não produz efeito até a aprovação.

---

## 7. Estados das solicitações

O funcionário deve acompanhar:

- Pendente
- Aprovada
- Recusada
- Cancelada

Enquanto pendente, permitir cancelamento quando a regra aplicável permitir.

---

## 8. Notificações

Possíveis notificações para o funcionário:

- solicitação recebida;
- solicitação aprovada;
- solicitação recusada;
- solicitação cancelada;
- ponto incompleto;
- aviso relacionado ao próprio registro;
- outras notificações pessoais definidas posteriormente.

---

## 9. O que não deve existir no app

Não implementar sem decisão futura explícita:

- dashboard de equipe;
- funcionários de terceiros;
- gestão de pessoas;
- alteração de cargos;
- alteração de centros de custo;
- configuração de jornadas;
- aprovação de solicitações;
- fechamento;
- relatórios gerenciais;
- administração de motivos;
- permissões;
- configurações administrativas;
- planos e assinatura;
- fiscal;
- folha.

---

## 10. Princípio de privacidade funcional

O app deve operar no contexto do próprio funcionário.

Regra mental:

```text
"Eu registro"
"Eu consulto"
"Eu solicito"
"Eu acompanho"
```

Nunca:

```text
"Eu gerencio minha equipe"
```

sem decisão explícita futura.
