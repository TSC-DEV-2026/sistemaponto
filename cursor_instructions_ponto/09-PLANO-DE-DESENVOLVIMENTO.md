# Plano de desenvolvimento

## Ponto 1 — Funcionário resolve pessoa e vínculo

O acesso deixa de ser um cadastro anterior ao funcionário. Pessoas > Funcionários grava a ficha e, na mesma operação, obtém o `person_id` e o vínculo desta empresa.

Hoje são dois passos. `POST /memberships` envia CPF, e-mail, nome e papel. `MembershipService.create` chama `upsert_person` no autenticador (pessoa global, chave CPF, sem senha) e insere `memberships` (`person_id`, `tenant_id`, `role`). A lista mostra o `person_id`, não o `memberships.id`. `POST /employees` repete nome, CPF e e-mail e só aceita esse número se já existir membership na empresa e se ele não estiver em outro funcionário.

Na criação, a API normaliza o CPF da ficha e usa o mesmo upsert:

- CPF novo no autenticador cria a pessoa e dispara o convite. O e-mail da ficha é obrigatório nesse caso.
- CPF existente devolve o `person_id`. Nome, e-mail e senha de lá permanecem. O e-mail informado fica em `employees.email`.
- Sem membership desta empresa para esse `person_id`, cria o vínculo com papel `member`. Com membership, reutiliza a linha. `uq_membership_person_tenant` segue impedindo duplicata.
- Grava `employees.person_id` com esse id.

Permanecem o 409 de CPF de funcionário repetido na empresa e o 409 de `person_id` já ligado a outro funcionário.

O campo Acesso (person id) sai do formulário, na criação e na edição. A edição não resolve de novo pelo CPF: o `person_id` gravado permanece. Permissões e Acessos continua para trocar o papel (`admin`, `manager`, `member`) e para quem entra no sistema sem ficha de funcionário. A senha continua só no autenticador.

## Ponto 2 — Tipo de registro e marcação no app

O funcionário tem um tipo só: `simple`, `qr` ou `face`. O campo entra em `employees` na criação e na edição. Quem já existe nasce como `simple`. No app, depois do login, a home mostra apenas o fluxo desse tipo. A marcação do próprio funcionário só entra se o `source` bater com o tipo. Correção manual, solicitação aprovada e AFD ficam fora dessa trava.

Hoje `home_screen.dart` mostra os três. O simples faz `POST /punches`. O QR cola o texto de `GET /punch-codes` e manda a selfie ao R2. O rosto manda `recognized: true` com um seletor online/offline, sem câmera e sem embedding.

### Registro simples

Botão. `POST /punches` com o horário atual e `source` `employee`. Sem foto.

### QR Code

O código em mãos é o payload já definido em `punch_code.py`: `unidade|cpf|matrícula` (`render_code` / `read_code`). Exige matrícula e unidade vigente. O app fotografa o QR e lê esse texto. Não há campo para digitar o código.

O payload lido tem de ser o do funcionário da sessão. Se a leitura falhar ou for de outra pessoa, a marcação não entra e dá para tentar de novo. Sem rede a marcação não entra e não fica no aparelho. A fila offline é só do reconhecimento facial.

Em seguida a câmera pede a selfie. Ela é obrigatória e fica guardada na marcação. Não passa por reconhecimento: não gera embedding e não decide quem é a pessoa.

### Reconhecimento facial

Referência: o clockup (`BlinkChallenge`, `OnnxArcfaceEmbedder`, `CosineMatcher`, `EmbeddingsSyncService`, `AttendanceService._server_verify`). Adapta o fluxo. Não copia o ponto que o clockup grava mesmo quando o servidor não confirma o rosto.

A foto de referência do funcionário gera o embedding no servidor, no mesmo papel do InsightFace `buffalo_l` / `w600k_r50`. Sem esse embedding, a batida facial não entra. O app, online, baixa os embeddings de quem usa facial na empresa e guarda no SQLite do aparelho.

Na batida, o desafio é fechar os dois olhos e reabrir. Foto parada com os olhos abertos não passa. Aí a captura vira embedding e compara por cosseno.

- Online: a foto sobe e o servidor extrai o embedding e casa com o cadastro. O resultado do servidor decide. `channel` `online`.
- Offline: compara com os embeddings locais. Se identificar, a marcação fica no SQLite do aparelho, com `channel` `offline`, e sobe quando a internet voltar. O envio leva um id de evento do aparelho para não duplicar.

Nos dois canais a marcação só entra se o match for o funcionário da sessão e passar o limiar. Outro rosto, rosto desconhecido ou falha na leitura não grava e permite nova tentativa.

### Fotos da marcação

QR grava a foto do código e a selfie. Facial grava a captura da batida. O simples não grava imagem. Por enquanto a evidência fica em `bytea` em `punches`: pesa menos que o mesmo arquivo em texto base64. O pedido leva a imagem em base64; a API decodifica antes de guardar e antes de extrair o embedding. A comparação facial é o cosseno dos vetores, não a igualdade das strings. Storage de objeto fica para depois; estas colunas saem quando ele existir.

## Ponto 3 — Jornada e Ponto em opções

Jornada e Ponto deixa de empilhar Jornadas, Marcações, Apuração e Banco de horas na mesma rolagem. A página passa a ter uma opção para cada uma, no mesmo modelo de Pessoas (Funcionários, Cargos, Centros de custo).

Ao abrir a opção, aparece a lista daquela seção. O formulário de inclusão abre pelo botão Novo, em tela própria. A edição de jornada também abre em tela própria.

- Jornadas: lista das escalas. O botão é Novo jornada.
- Marcações: lista das marcações. O ajuste do dia, que já existe, abre pelo botão Ajustar marcações. Esta opção não registra ponto no lugar do funcionário.
- Apuração: consulta do período. Não há cadastro novo.
- Banco de horas: lista dos lançamentos e o saldo. O botão é Novo lançamento.

A ficha do funcionário continua mostrando a apuração, o banco e o ajuste daquela pessoa.

## Ponto 4 — Registro de ponto só do funcionário

O bloco Registro do administrador sai de Registro de Ponto. Ele escolhe um funcionário e chama `POST /punches` com o horário de agora. A API grava essa marcação com origem `admin` e ainda ignora o tipo da ficha. Isso deixa de existir.

`POST /punches` passa a aceitar só a marcação da própria pessoa logada. A origem continua `employee` e o tipo da ficha continua valendo: simples no site e no app, QR Code e reconhecimento facial no app.

O ajuste do dia (`POST /punches/corrections`, origem `manual`), a solicitação aprovada e a importação do AFD permanecem, cada um com a origem que já tem. O gestor e o administrador ajustam por esse caminho. Não marcam o ponto de outra pessoa.

Na tela, quem tem ficha vê o próprio tipo. O simples continua com o botão Registrar. QR Code e reconhecimento facial continuam no aplicativo.

## Ponto 5 — Fiscal / Folha em opções

Fiscal / Folha deixa de juntar arquivo fiscal e totais na mesma rolagem. Passa a ter duas opções, no mesmo modelo de Pessoas.

- AFD: gerar AFD, gerar AEJ e a lista dos arquivos já gerados. O AEJ permanece aqui porque já sai do mesmo gerador. Importar AFD deixa de ser um texto colado. A pessoa escolhe um arquivo `.txt`. O site lê o arquivo e envia o mesmo conteúdo que `POST /fiscal-files/imports` já recebe.
- Totais da folha: a consulta do mês, com horas trabalhadas, hora extra, adicional noturno, falta de tempo e saldo do banco.

## Ponto 6 — Plano e Assinatura em opções

Plano e Assinatura deixa de juntar o plano em vigor, o formulário de contratação, as assinaturas e as cobranças na mesma rolagem. Passa a ter duas opções, no mesmo modelo de Pessoas.

- Assinaturas e Cobranças: ao abrir, mostra o plano em vigor, ou o trial quando ainda não há plano. Abaixo ficam as listas de assinaturas e de cobranças. Registrar pagamento continua na linha da cobrança em aberto.
- Contratação: o formulário de contratar, quando não há plano, e de alterar, quando já há. Capacidade, pagamento e as regras atuais permanecem. Contratar, alterar e pagar seguem com o administrador.

## Ponto 7 — App: resultado da marcação, opções e facial sem rede

A home do aplicativo hoje carrega funcionário, marcações, apuração do mês, banco e jornada numa lista só. O aviso de sucesso ou de falha fica no fim dessa lista. Sem internet, a abertura espera `GET /auth/me` numa tela vazia. Se essa chamada falha, a sessão guardada é apagada. O reconhecimento facial offline não chega a abrir.

Depois de registrar, simples, QR Code ou facial, o aplicativo mostra na hora o resultado: ponto registrado, ou a falha, com a mensagem que a API devolveu. O aviso aparece antes da lista do mês.

A home separa o que hoje está junto, em opções: Registro, Apuração do mês, Marcações e Banco de horas. O registro mostra só o tipo da ficha.

Sem rede, a sessão já guardada permanece e a tela abre. O reconhecimento facial usa o embedding local e deixa a marcação na fila do aparelho, como o Ponto 2 já define. Jornada, apuração, marcações do mês e banco podem deixar de carregar. Essa falta não bloqueia o registro facial.

## Ponto 8 — Fotos da marcação e da referência no bucket

A foto da marcação deixa de ficar no banco. Hoje `punches` guarda em `bytea` a captura do rosto, a selfie do QR Code e a foto do próprio QR. A lista de Marcações não mostra imagem, mas a consulta traz esses arquivos. O banco está em outro servidor, e esse volume deixa a lista lenta.

No cadastro, quando o tipo é reconhecimento facial, o site pede a foto de referência. Hoje essa foto só gera o embedding e não fica guardada. Ela também vai para o bucket. O embedding continua no banco, porque é ele que compara o rosto. Na ficha fica o caminho do arquivo.

O aplicativo continua enviando a imagem da marcação em base64. A credencial do bucket não vai para o app nem para o site. A API confere o ponto como hoje: o QR tem de ser da pessoa logada, e o rosto tem de passar na comparação.

Só depois da marcação aceita, e ao gravar ou trocar a foto de referência, a API sobe o arquivo no bucket `sistemaponto`, pelo armazenamento que já grava a foto do atestado. O caminho volta no formato `empresa/pasta/arquivo.jpg`. A selfie, a captura do rosto, a foto do QR e a foto de referência ficam em pastas separadas. Na marcação, o caminho substitui o `bytea`.

A lista de Marcações passa a trazer só texto. Para ver a imagem da marcação ou a foto de referência da ficha, uma consulta à parte usa o caminho e gera um link temporário, no mesmo modelo da foto do atestado.

A fila offline do celular continua com a foto no aparelho. Quando a marcação sobe, a API grava no bucket. As fotos que já estão em `bytea` são copiadas uma vez para o bucket e o binário delas é esvaziado. Sem isso, a lista dessas marcações antigas continua lenta.

## Ponto 9 — Equipe define setor e unidade

Na aba Trabalho, unidade e setor saem da lista de vínculo. A hierarquia já é unidade, depois setor, depois equipe. A equipe sempre pertence a um setor, e o setor sempre pertence a uma unidade. Cargo, jornada, centro de custo, sindicato, gestor e situação continuam como vínculos próprios.

A ficha segue mostrando unidade e setor, só para leitura, preenchidos pela equipe vigente. Os cadastros de unidade, setor e equipe continuam em Estrutura Organizacional.

Ao registrar uma equipe, com a mesma data de vigência, a API grava três vínculos: a equipe, o setor dessa equipe e a unidade desse setor. A vigência aberta de cada um é encerrada como já acontece hoje. Quem estava na equipe A, no setor B e na unidade C, ao passar para a equipe X, passa no mesmo ato para o setor Y e a unidade Z dessa equipe. A partir dessa data, a ficha, o QR e os filtros usam Y e Z. O QR continua exigindo unidade vigente, e essa unidade passa a vir junto com a equipe.

A API recusa gravar unidade ou setor direto na ficha. Quem já tem unidade ou setor lançados à mão permanece assim até a próxima equipe. O histórico dessas vigências antigas fica.

Se uma equipe for movida de setor no cadastro, quem já estava nela conserva a unidade e o setor da data em que entrou. Uma nova vigência de equipe é o que realinha os três.

## Ponto 10 — Operações em massa

O administrador altera o vínculo de várias pessoas de uma vez. Entra um item no grupo Gestão do menu, Operações em massa, visível só para o administrador.

A tela trata uma operação por vez: cargo, centro de custo, jornada, equipe, situação, gestor, sindicato ou tipo de registro. O tipo de registro é simples, QR Code ou reconhecimento facial. Unidade e setor não são operações. A equipe segue o Ponto 9 e, na mesma data, grava também o setor e a unidade. O tipo de registro é um campo da ficha, não uma vigência: a troca não pede data.

Os filtros se combinam e valem para todas as operações, inclusive gestor e tipo de registro: cargo, centro de custo, jornada, equipe, setor, unidade, sindicato e gestor. A situação filtra ativo, desligado ou todos. A lista usa a vigência vigente hoje. Desligado entra no filtro. Todos inclui também quem ainda não tem situação. A lista mostra o nome e o valor atual da operação escolhida.

Ninguém é alterado até ser marcado. Marcar todos do filtro vale para a seleção inteira, não só para a página visível. Em seguida vêm o novo valor, a data de vigência e a observação, com as mesmas regras da ficha. No tipo de registro, só o novo valor. Reativar alguém respeita o limite do plano. Período fechado bloqueia a data. O gestor escolhido não pode ser a própria pessoa.

Hoje a ficha recusa salvar o reconhecimento facial sem a foto de referência, no site e na API, com a mensagem "Informe a foto de referência." Essa trava sai da criação, da edição e da operação em massa. A foto continua disponível e, quando enviada, segue gerando o embedding e o arquivo no bucket. Sem ela, o tipo fica facial mesmo assim.

Na batida facial, online ou offline, se não houver foto de referência, a marcação não entra e a resposta é "Este funcionário não tem foto de referência."

A gravação é uma só. Se uma pessoa da seleção falhar, nenhuma daquele lote é salva, e a mensagem diz quem e por quê.

## Ponto 11 — Nomes da lista de acessos numa consulta

A lista de Permissões e Acessos continua igual. `GET /memberships` segue devolvendo `id`, `person_id`, `full_name` e `role`, paginado, com os filtros `role` e `person_id`. O limite da página continua de 1 a 100. O nome continua só no autenticador. A tabela `memberships` não ganha coluna de nome.

Hoje `MembershipService.list` lê a página no banco do Ponto e, para cada linha, `view` chama `AuthenticatorClient.person_state`. Isso é `GET /internal/people/{person_id}`, uma ida por acesso, em sequência. Uma página de 10 espera dez respostas antes de o site sair do carregamento. O banco do Ponto responde na hora. O tempo está nessas idas. O detalhe, o vínculo novo e a troca de papel continuam com essa consulta de uma pessoa, porque cada um mostra um acesso só.

A lista passa a mandar os `person_id` da página numa chamada. O autenticador devolve os nomes juntos. O Ponto monta as linhas na ordem que já saiu do banco dele e casa cada nome pelo `person_id`. A ordem da resposta do autenticador não reordena a página. A tela espera a mesma resposta de sempre. O que muda é essa resposta nascer de uma ida, não de dez.

No autenticador, a rota interna nova é `POST /internal/people/lookup`, no mesmo router de `/internal`, com a mesma chave de API. O corpo é `{ "person_ids": [1, 2, 3] }`. A resposta traz, para cada pessoa encontrada, `person_id` e `full_name`. Não devolve senha, e-mail, CPF nem `auth_version`: a lista não usa isso. `GET /internal/people/{person_id}` permanece e continua devolvendo o estado completo, usado no login, no detalhe, na criação e na alteração.

A busca é uma consulta pelos identificadores recebidos, no mesmo banco de pessoas. Não chama `get_person` em laço. Identificador repetido no corpo entra uma vez. Lista vazia devolve lista vazia, sem consultar o banco. O teto é o mesmo da página de vínculos: no máximo 100. Acima disso, a rota responde 400.

Quem não existe fica de fora da resposta. O Ponto não inventa nome e não derruba a página por causa de um identificador ausente. Essa linha sai com `full_name` vazio, e o site já mostra Não informado.

Disparar as chamadas de hoje ao mesmo tempo fica de fora. A espera cai, mas o número de consultas continua crescendo com o tamanho da página. Gravar `full_name` em `memberships` também fica de fora: o autenticador é a origem do nome, e a alteração da pessoa lá deixaria a cópia do Ponto velha.

No Ponto, `AuthenticatorClient` ganha o método dessa consulta e o falso dos testes passa a respondê-la. `MembershipService.list` chama o método uma vez, depois de ler a página local, e preenche o `full_name` de cada linha. `view` segue em `person_state` no detalhe, na criação e na alteração. O contrato de `MembershipOut` não muda, e o site não ganha campo nem chamada nova.

## Ponto 12 — Programada, carga e livre

A jornada deixa de ser um horário único de manhã e de tarde, tratado como 5x2. Passa a ter três tipos: Programada, Carga e Livre.

Hoje `journeys` guarda `morning_start`, `morning_end`, `afternoon_start` e `afternoon_end`. `settle_day` considera dia de trabalho o `weekday() < 5`. Sábado e domingo nascem sem jornada. A tolerância está fixa em 10 minutos em `TOLERANCE_MINUTES`. A vigência em `employee_vigencies` tem a data e a jornada, sem o dia da sequência. A saída que passa da meia-noite só volta para o dia anterior se cair até as 05:00 (`_take_night_exit`). O texto da apuração fala em escala 5x2 e tolerância de 10 minutos. A Jornada Padrão da empresa nasce 08:00–12:00 e 13:30–17:30.

O cadastro pede o tipo. Os quatro horários saem do formulário. O texto da apuração deixa a escala 5x2 fixa e passa a descrever o tipo vigente.

### Programada

A pessoa inclui os dias, um a um. Cada dia é trabalho ou folga. No trabalho, inclui os pares de entrada e saída que precisar: um turno, manhã e tarde, ou mais. Cada par tem os dois horários, em ordem, sem sobrepor o próximo. Folga não tem par. Dia de trabalho sem par não grava. A quantidade de dias é a da sequência: 7, 14, 21 ou o quanto a pessoa incluir. A sequência não olha o dia da semana.

No funcionário, a vigência pede a data e em qual dia da sequência essa data cai. Dali em diante a posição é a contagem desses dias, e ao terminar a sequência volta ao dia 1. Duas pessoas podem usar a mesma jornada e começar em dias diferentes. A operação em massa de jornada pede esse dia, junto da data que a ficha já pede. Carga e Livre seguem só com a data.

Dia de trabalho sem marcação é falta, e o tempo previsto vira falta de tempo. Chegou e fez menos: falta de tempo, sem a falta do dia. Folga trabalhada é hora extra. Marcação ímpar continua ponto incompleto e não fecha extra nem falta de tempo até o par existir. Com banco de horas, o excedente e a falta de tempo do dia seguem para o banco, no lugar da hora extra e do desconto.

A jornada flexível e a tolerância ficam na Programada. A tolerância é campo da jornada, com padrão de 10 minutos. Com a flexível desligada, a apuração compara os horários como hoje: atraso dentro da tolerância conta como o horário previsto; atraso acima desconta o atraso inteiro; saída antecipada desconta o tempo. Com a flexível ligada, compara a duração feita no dia com a duração prevista. Vários trechos somam. Dentro da tolerância, vale a duração prevista. Acima dela, conta a diferença inteira. 08:00–12:00 feito como 13:30–17:30 cumpre o dia. Se o dia tem intervalo previsto e o intervalo feito for menor, permanece o aviso "intervalo menor do que o previsto". O mínimo do intervalo continua 1 hora. A marcação permanece.

### Carga

O cadastro pede o total da semana. Não há dia, horário nem folga. A semana corre de segunda a domingo. De segunda a sábado a apuração mostra o tempo trabalhado. No domingo, ou no último dia em que a carga valeu naquela semana, soma as marcações e compara com o total. Acima vira hora extra. Abaixo vira falta de tempo, em minutos. Dia sem marcação entra como zero e não é falta. Com banco de horas, o saldo desse fechamento entra no banco. Sem banco, vira hora extra ou desconto.

Semana incompleta, na admissão, na troca ou no desligamento, usa os dias em que a carga esteve vigente. A meta é o total vezes esses dias, dividido por 7, no minuto mais próximo. Três dias de uma carga de 44:00 dão 18:51.

### Livre

Não há total, dia nem horário. O tempo marcado é o tempo a receber. Dia sem marcação fica em zero, sem falta e sem hora extra. Nada entra sozinho no banco de horas.

### Os três tipos

A marcação que atravessa a meia-noite fica no dia em que começou. O par aberto fecha com a marcação seguinte, e o limite das 05:00 deixa de cortar o turno. O turno de domingo à noite entra na semana que fecha nesse domingo. O adicional noturno permanece nas horas feitas dentro do período já configurado, e esses minutos continuam fora do banco.

Feriado, férias, afastamento, abono integral e atestado integral ficam por cima do tipo. Na Programada, o dia segue a regra de hoje: feriado não gera falta e o trabalho nele é hora extra; férias, afastamento, abono integral e atestado integral tiram a falta. Na Carga, cada um desses dias sai da meta. Uma carga de 44:00 com um feriado fica em 37:43. As horas feitas nesse dia não cumprem a meta. No feriado, viram hora extra. Em férias, afastamento, abono integral ou atestado integral, ficam como tempo marcado, sem extra e sem falta. Na Livre, o feriado trabalhado vira hora extra. Os outros deixam o dia sem falta e sem meta.

A flexível e a tolerância não entram na Carga nem na Livre.

Alterar horário, folga, total, tolerância ou flexível pede a data em que o conteúdo novo passa a valer. A apuração anterior lê o conteúdo da época. Período fechado bloqueia essa data, como na vigência. Mudar a quantidade de dias pede de novo, nessa data, em qual dia da sequência ela cai. Trocar o horário de um dia não move a contagem de quem já está no meio.

Jornada já cadastrada, inclusive a Jornada Padrão, vira Programada de 7 dias: o horário atual de segunda a sexta, sábado e domingo de folga, flexível desligada, tolerância de 10 minutos. Na vigência já existente, a data de início cai no dia da sequência que preserva a semana. Uma quarta-feira continua dia de trabalho. Esse encaixe pelo dia da semana vale só nessa conversão.

## Ponto 13 — Aparelho compartilhado

O aplicativo de cada funcionário permanece como está. Uma pessoa entra com a própria conta e registra o ponto da empresa da sessão. O aparelho compartilhado é outro aplicativo, na pasta `mobile2`, ao lado de `mobile`. A identidade visual é a mesma do `mobile`. Mudam as telas que esse aparelho precisa: não há login de funcionário, não há home da pessoa, não há solicitação, apuração nem banco. A tela libera o aparelho e registra o ponto.

Nesse aparelho cabem várias empresas sem relação entre si. Cada uma autoriza o aparelho pela própria conta. A senha e a sessão do administrador não vão para o aparelho.

### Liberação

Na instalação, o `mobile2` gera um identificador daquele aparelho e o guarda. No site, o administrador da empresa pede um código de liberação. O código é curto, vale alguns minutos e serve uma vez. Significa só que o aparelho que o apresentar pode registrar ponto naquela empresa.

Quem configura digita o código. O aplicativo envia o identificador e o código. O servidor confere, grava o vínculo daquele aparelho com aquela empresa e invalida o código. No lugar, devolve uma chave só de registro de ponto. A chave fica no aparelho. Com ela não se abre o site, não se lista funcionário e não se altera cadastro.

Pelo menos uma empresa é obrigatória. Outra empresa entra do mesmo modo, com o código gerado na conta dela. O aparelho passa a ter uma chave por empresa. Revogar no site derruba a chave daquela empresa e apaga os embeddings dela no aparelho. A chave e os embeddings das outras permanecem. Sem rede, a revogação vale quando o aparelho volta a falar com o servidor. A fila dessa empresa sobe e o servidor a recusa.

### Registro

Os dois botões ficam sempre na tela: reconhecimento facial e QR Code. O registro simples não existe nesse aplicativo. Quem está como simples continua no aplicativo de cada funcionário. O servidor recusa marcação simples vinda do aparelho compartilhado.

O método continua sendo o da ficha de cada funcionário, não o da conta. O botão fica habilitado quando, entre as empresas pareadas, existe ao menos uma pessoa naquele método. Uma empresa só com facial deixa o QR Code desabilitado. Uma empresa com os dois métodos deixa os dois habilitados. Duas empresas em métodos diferentes deixam os dois habilitados. Duas empresas só no facial deixam o QR Code desabilitado. Essa habilitação vem do servidor, porque o tipo da ficha pode mudar depois.

No facial, o aparelho baixa os embeddings de quem usa facial em cada empresa pareada e guarda separado por empresa. Com rede, a foto sobe e o servidor compara em cada empresa, só entre quem está no facial. Sem rede, o aparelho compara com os embeddings locais, também empresa por empresa, no mesmo modelo do aplicativo de cada funcionário. A marcação fica na fila se uma empresa reconhecer e as outras não. Se duas reconhecerem, ou se nenhuma reconhecer, a marcação não entra e não fica no aparelho. Quando a internet volta, a fila sobe e o servidor repete a comparação. Se o rosto não confirmar, se a pessoa mudou de método ou se a empresa revogou o aparelho, aquela marcação não entra. A última habilitação recebida do servidor vale sem rede, para o facial poder registrar.

No QR Code, a marcação só entra com rede, no `mobile` e no `mobile2`. Sem rede ela não entra e não fica no aparelho. O aparelho lê o payload já definido, `unidade|cpf|matrícula`. A marcação entra se esse código apontar para uma única pessoa, entre as empresas pareadas, com tipo QR Code. Duas pessoas ou nenhuma recusam a marcação. A selfie continua obrigatória, como no Ponto 2.

A evidência da marcação segue o Ponto 2 e o Ponto 8: o facial grava a captura, o QR Code grava a foto do código e a selfie. A marcação fica na empresa e no funcionário que o servidor reconheceu.
