# Plano de desenvolvimento — {{PROJECT_NAME}}

Este arquivo ordena a implementação. Não cria regra nova.

A regra está em `04-BUSINESS-RULES-AND-WORKFLOWS.md`, `03-MOBILE-APP-SCOPE.md` e `06-PLANS-TRIAL-AND-SUBSCRIPTION.md`.

Comando para começar um ponto:

```text
vamos desenvolver o ponto 1
```

Troque o número. Um comando desenvolve só aquele ponto.

## Já entregue

Não refazer neste plano:

- conta, empresa, trial de 7 dias e capacidade;
- cadastros de pessoas, organização, jornada, regras trabalhistas e motivos;
- vigência e histórico;
- marcação pelo botão do app e marcação manual;
- solicitação pendente que não altera a marcação;
- aprovação de uma marcação isolada e de abono ou atestado como ocorrência;
- fechamento por mês, com bloqueio do período fechado e sem reabertura;
- aviso dentro do sistema para solicitação e limite do plano;
- dashboard operacional.

## Ponto 1 — Marcações que valem

O ajuste passa a trazer as marcações do dia.

Ao aprovar, as marcações novas valem. As antigas deixam de valer e permanecem no histórico. A correção manual do administrador segue a mesma regra. A origem fica explícita: solicitação ou manual.

O gestor da equipe aprova a própria equipe e não decide a própria solicitação. O administrador também aprova, em qualquer equipe.

## Ponto 2 — Abono, atestado, afastamento e férias

O funcionário solicita abono, atestado, afastamento e férias. O gestor ou o administrador também lança os quatro manualmente. A origem fica explícita: solicitação ou manual.

O atestado tem um tipo só. Os campos são CID, CRM e nome do médico. A foto é opcional. O período pode ser o dia inteiro, algumas horas ou vários dias. Se já houver marcação no período, o atestado entra e o ponto avisa "período abonado conflita com registro de ponto". O documento fica visível para o solicitante, o gestor da equipe e o administrador.

O efeito do abono sobre a falta entra no ponto 3, quando a apuração existir.

## Ponto 3 — Apuração

A apuração usa só as marcações que ainda valem, a jornada vigente, o calendário e as ocorrências.

Neste corte a escala é a 5x2. Os padrões abaixo valem até sindicato ou convenção trazer outro valor:

- tolerância de 10 minutos; atraso dentro dela conta como horário previsto; atraso acima desconta o atraso inteiro;
- saída antecipada desconta o tempo;
- intervalo mínimo de 1 hora; se for menor do que o previsto, o ponto avisa "intervalo menor do que o previsto" e a marcação permanece;
- hora extra é o tempo acima da quantidade prevista;
- adicional noturno de 20% só nas horas trabalhadas entre 22:00 e 05:00; esses minutos não entram no banco;
- feriado é dia sem trabalho; se houver trabalho, todo o período vira hora extra;
- abono aprovado, quando havia falta, marca o dia sem falta.

Ponto incompleto é quantidade ímpar de marcações num dia de trabalho. Feriado, férias, afastamento, abono do dia inteiro e atestado do dia inteiro ficam fora dessa conta. Atraso, saída antecipada e intervalo menor não são ponto incompleto.

## Ponto 4 — Banco de horas

Com banco, o que passa da jornada soma no saldo e o que fica abaixo compensa. Sem banco, o excedente é hora extra e a falta de tempo é falta com desconto.

O saldo é contínuo, sem limite, e acumula até alguém quitar. O prazo padrão é de 6 em 6 meses e, neste corte, só gera o aviso "Saldo irá expirar em x dias".

O gestor ou o administrador quita no todo ou em parte, a qualquer momento, também fora do fechamento. O padrão é pagar como hora extra. Saldo negativo desconta como falta. Os dois também lançam crédito ou débito manual no banco.

O adicional noturno não entra nos minutos do saldo. O funcionário só consulta o próprio saldo.

## Ponto 5 — Fechamento

O gestor ou o administrador escolhe o período, em geral o mês civil, e fecha num passo. A conferência dos pontos é norma de processo, sem etapa gravada.

O fechamento não ocorre quando existe solicitação pendente, ponto incompleto ou conflito entre abono ou atestado e marcação. O aviso de intervalo menor não impede.

Depois de fechado, ficam bloqueados no período: marcação, ajuste, ocorrência, vigência, quitação do banco e lançamento manual no banco. Corrigir só depois de reabrir.

Cancelar exige motivo e deixa o período cancelado no histórico. Reabrir exige motivo e devolve o mesmo período a aberto.

## Ponto 6 — Arquivos fiscais

A exportação de AFD não depende de período fechado. A importação cria marcação com origem própria. Se a marcação já existe, só ela é ignorada e as demais seguem.

A exportação de AEJ sai só de período fechado.

Os totais da folha levam horas trabalhadas, hora extra, adicional noturno, falta e saldo do banco.

Arquivo de período cancelado ou reaberto deixa de valer e precisa ser gerado de novo.

## Ponto 7 — Avisos

O texto é o mesmo no sistema e no e-mail. Cada aviso pode ser desligado. O envio é diário.

Frases e prazos estão em `04-BUSINESS-RULES-AND-WORKFLOWS.md`, na seção de notificações. Fechamento próximo e trial terminando começam 3 dias antes.

A frequência customizável fica para o futuro.

## Ponto 8 — Cobrança

A cobrança em vigor é mensal, R$ 5 por pessoa. Os pagamentos são Pix, boleto e cartão de débito ou crédito.

O upgrade cobra pró-rata. O downgrade só ocorre se a nova capacidade couber nos funcionários contabilizados, e o valor muda no mês seguinte. A inadimplência avisa e bloqueia o uso em 7 dias. No fim dos 7 dias de trial, o sistema pede a contratação de um plano.

Uma revisão futura pode alterar o preço. Até lá, R$ 5 é o valor em vigor.

## Ponto 9 — Relatórios

Um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão. São analíticos e históricos. O dashboard continua operacional.

## Ponto 10 — QR Code e reconhecimento facial

O registro simples, que é o botão, já existe.

O QR Code é gerado com unidade, CPF e matrícula, junto com a selfie. O reconhecimento facial vale online e offline. Se a selfie, o QR ou o rosto falhar, o ponto não é marcado e a pessoa tenta de novo.

A matrícula ainda não existe no cadastro do funcionário. Ela entra neste ponto, porque o QR depende dela.
