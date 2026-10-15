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

## Ponto 11 — Máscara de CPF

Todo campo de CPF, no site e no aplicativo, mostra a máscara `000.000.000-00` enquanto a pessoa digita.

O campo aceita só número. Letra, espaço e símbolo não entram. Passa de 11 dígitos, o excedente é ignorado.

O valor enviado à API continua só com os 11 dígitos, sem ponto e sem traço.

## Ponto 12 — Ver a senha

Todo campo de senha, no site e no aplicativo, nasce oculto e tem um botão de olho no próprio campo.

O olho alterna entre ocultar e mostrar. Oculto, o ícone é o olho. Visível, o ícone é o olho cortado. Isso vale para senha, senha atual, senha nova e confirmação, nas telas de entrar, criar conta, definir senha e trocar senha.

## Ponto 13 — Carregamento

Ao acionar um botão aonde ele executa uma ação, como logar, ele tem que bloquear o botão, no caso, não deve permetir que a pessoa clique nele enquanto a ação não for terminada, e durante o carregamento, o texto do botão deve ser trocado por um spinner, indicando assim o carregamento.

## Ponto 14 — Tela de solicitações

Em Solicitações, gestor e administrador veem só a lista. O formulário de criar não fica nessa tela.

Quem está logado e tem funcionário ligado ao próprio acesso vê o botão "Nova solicitação". Esse botão abre outra tela, com ajuste, abono, atestado, afastamento e férias. Quem não bate ponto não vê o botão.

Quem é gestor ou administrador e também bate ponto vê a lista e o botão.

## Ponto 15 — Voltar

Toda tela que não é um item da barra lateral tem o botão "Voltar" no topo, com ícone, antes do título.

O botão volta para a lista de onde a tela foi aberta. Novo funcionário volta para a aba Funcionários. O cadastro de qualquer entidade do ponto 16 volta para a aba dessa entidade.

## Ponto 16 — Listagem e cadastro

Cada entidade tem a própria aba na tela do domínio:

- Pessoas: Funcionários, Cargos, Centros de custo;
- Estrutura Organizacional: Unidades, Setores, Equipes;
- Regras Trabalhistas: Sindicatos, Convenções e acordos, Feriados, Regras de ponto;
- Motivos: Ajustes, Faltas, Abonos, Atestados.

A aba é só a listagem. Ela tem o campo "Pesquisar", a lista e um botão "Novo" com o nome da entidade, como "Novo funcionário". Nenhum campo de cadastro aparece nessa tela.

A pesquisa filtra pelo nome. Em funcionário, também pelo CPF. Ao pesquisar, a lista volta para a página 1. A página mostra 20 registros, com "Anterior" e "Próxima" quando houver mais de uma.

Cada linha tem três botões com ícone, um ao lado do outro: olho para visualizar, lápis para editar e lixeira para excluir. Visualizar abre a ficha somente leitura. Editar abre o formulário já preenchido. Excluir pede confirmação antes de apagar.

O formulário é outra tela. Ela tem os campos, Salvar e o Voltar do ponto 15. Não lista os registros.

Botão de ação no site leva ícone junto do texto. Vale para Novo, Voltar, Salvar, Remover, Consultar, Gerar e Imprimir.

## Ponto 17 — Vazio na aba Trabalho

Na aba Trabalho do funcionário, cargo, jornada, centro de custo, unidade, setor, equipe, sindicato e gestor sem valor exibem "Não possui".

O traço deixa de ser usado no lugar de valor vazio.

## Ponto 18 — Avisos em Configurações

O item Notificações sai do grupo Gestão da barra lateral. A rota antiga deixa de ser entrada do menu.

Os interruptores de aviso que hoje estão nessa tela passam para uma seção "Notificações" dentro de Configurações. O texto, o padrão ligado e o envio diário permanecem os do ponto 7.

## Ponto 19 — Estrutura organizacional

Unidades, setores e equipes seguem o ponto 16.

No formulário, o rótulo do nome é "Nome da unidade", "Nome do setor" ou "Nome da equipe".

O setor escolhe a unidade numa lista carregada ao abrir o formulário. A equipe escolhe o setor do mesmo modo. Um cadastro gravado antes entra nessa lista.

## Ponto 20 — Regras trabalhistas

Sindicatos, convenções e acordos, feriados e regras de ponto seguem o ponto 16.

No formulário, o rótulo do nome é "Nome do sindicato", "Nome da convenção ou do acordo", "Nome do feriado" ou "Nome da regra de ponto".

A convenção escolhe o sindicato numa lista carregada ao abrir o formulário. Sindicato gravado antes entra nessa lista.

## Ponto 21 — Configurações

Configurações tem três seções.

"Minha conta" mostra nome, e-mail e CPF da pessoa logada. Visualizar é essa leitura. Editar abre o nome e o e-mail para salvar. O CPF não é editado aqui. Excluir pede confirmação e remove o acesso desta pessoa nesta empresa. Se ela for a única administradora, a exclusão não ocorre e a tela mostra "A empresa precisa de um administrador."

"Notificações" é a seção do ponto 18.

"Permissões e acessos" abre a lista de vínculos já existente. O item Permissões e Acessos permanece na barra lateral.

## Ponto 22 — Jornada de ponto

No lançamento das marcações de um dia, o botão de retirar um horário deixa de se chamar Tirar. O texto é "Remover", com ícone de lixeira.

## Ponto 23 — Ajustes e ocorrências

Nos formulários de ajuste, abono, atestado, afastamento e férias, no site e no aplicativo, os rótulos de período são "De" e "Até". Início e Fim deixam de ser usados nesses campos.

Férias aceitam só período de dias. A opção de algumas horas não aparece, e a API recusa férias enviadas com horário.

No atestado, o CID pode ficar vazio. CRM e nome do médico continuam obrigatórios. A foto continua opcional.

## Ponto 24 — Reabrir o período

Em Fechamento do Ponto, Reabrir não conclui no primeiro clique. Abre a confirmação com o motivo já exigido e o texto: "O período volta a aberto. Marcação, ajuste, ocorrência, vigência e banco podem ser lançados de novo. O arquivo fiscal deste período deixa de valer."

A reabertura só segue depois de confirmar.

## Ponto 25 — Mês

Onde o fechamento, a geração de arquivo fiscal ou a folha pedem o mês, o campo é uma lista: Janeiro, Fevereiro, Março, Abril, Maio, Junho, Julho, Agosto, Setembro, Outubro, Novembro e Dezembro.

O valor enviado continua sendo o número do mês, de 1 a 12. Texto livre não é aceito.

## Ponto 26 — Relatórios

Em Relatórios, o rótulo da lista de grupos é "Tipo de relatório".

O resultado mostra "N registros encontrados", com N no lugar da quantidade. Zero registro usa "Nenhum registro neste período."

O botão "Imprimir" gera o PDF da consulta atual, com todos os registros do período consultado, não só os da página visível. O PDF leva o nome do relatório e o intervalo De–Até.

## Ponto 27 — Arquivos fiscais

Em Fiscal / Folha, o rótulo da escolha do arquivo é "Tipo de arquivo".

Com AFD selecionado, a tela mostra: "Arquivo com as marcações. Sai de qualquer período." Com AEJ selecionado, mostra: "Arquivo da jornada. Sai só de um período fechado."

O botão de gerar usa o arquivo escolhido: "Gerar AFD" ou "Gerar AEJ". O mês segue o ponto 25.
