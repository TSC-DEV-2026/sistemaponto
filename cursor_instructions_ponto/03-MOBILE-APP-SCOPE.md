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

Modalidades previstas no produto:

- Registro Simples
- QR Code + Selfie
- Reconhecimento Facial
  - Online
  - Offline

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

- saldo atual;
- créditos;
- débitos;
- período de referência quando aplicável.

Nenhuma gestão de banco de horas deve ser feita pelo funcionário via app sem definição futura explícita.

---

## 6. Solicitações

O funcionário deve poder criar solicitações.

Tipos atualmente previstos:

### Ajuste de Ponto

Exemplo:

```text
Data
31/08/2026

Marcação solicitada
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

O funcionário pode solicitar abono conforme regras futuras da empresa.

A solicitação não efetiva o abono até aprovação.

### Atestado

Permitir:

- informar período;
- selecionar motivo quando aplicável;
- anexar documento;
- adicionar observação;
- enviar para análise.

O envio não significa aprovação.

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
