# Roteiro INPI e enquadramento REP-P (Portaria 671)

Documento operacional. **Não substitui advogado trabalhista nem assessoria de propriedade intelectual.** Valores de GRU e prazos mudam: confira sempre o portal do INPI e o FAQ do MTE antes de protocolar.

Fontes principais:

- [Solicitar registro de programa de computador (gov.br)](https://www.gov.br/pt-br/servicos/solicitar-o-registro-de-programa-de-computador)
- [Guia / FAQ programas de computador (INPI)](https://www.gov.br/inpi/pt-br/assuntos/programas-de-computador)
- [Portaria MTP nº 671/2021](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/legislacao/portarias-1/portarias-vigentes-3/)
- [Perguntas e Respostas — Portaria 671 (MTE)](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/fiscalizacao-do-trabalho/Perguntas%20e%20Respostas%20REP)

---

## 1. O que o INPI resolve (e o que não resolve)

Há dois assuntos diferentes que as pessoas misturam:

| Assunto | Órgão | Para quê |
|---|---|---|
| **Registro de programa de computador** | INPI (e-Software) | Prova de titularidade/autoria do software; **obrigatório para REP-P** (art. 91 da Portaria 671) |
| **Registro de marca** (nome/logo) | INPI (marcas) | Protege o nome comercial (ex.: marca do produto). **Opcional** para o ponto funcionar como REP-P, mas recomendável quando o nome estiver escolhido |
| **Homologação no Ministério do Trabalho** | — | **REP-P não precisa** de homologação no MTE (FAQ 12). Isso é mundo do **REP-C** (equipamento) |

O registro de programa **não** “homologa” o sistema perante a fiscalização sozinho. Para operar como **REP-P**, além do certificado INPI o software precisa atender o **art. 78** e o **Anexo IX** da Portaria 671 (comprovante, NSR, hash SHA-256, AFD, etc.).

---

## 2. Seu produto no mapa da Portaria 671

O SREP “via programa” tem quatro peças (art. 75, III):

1. **REP-P** — programa em servidor/nuvem que registra a jornada  
2. **Coletores de marcações** — app, tablet, web, etc. que **recebem** a batida e **enviam** ao REP-P  
3. **Armazenamento de registro de ponto**  
4. **Programa de Tratamento de Registro de Ponto (PTRP)** — tratamento, AEJ, etc.

No nosso caso (site + API + `mobile` + `mobile2`):

- A **API / núcleo em nuvem** que grava a marcação, emite comprovante/AFD no papel de registrador → tende a ser o **REP-P** (é este que o art. 91 manda registrar no INPI).
- Apps e telas de batida → **coletores** (não há homologação MTE específica de “coletor”; o coletor alimenta o REP-P).
- Apuração, fechamento, AEJ, totais → papel de **PTRP** (FAQ 36: PTRP **não** precisa ser homologado no MTE).

**Não há** uma “autorização extra do Ministério” só por ser coletor + tratamento, no modelo REP-P. O que existe é:

1. Certificado INPI do **programa REP-P**  
2. Cumprir **Anexo IX** + arts. 78–80 (e correlatos)  
3. Se no futuro alguém operar o mesmo produto como **REP-A**, aí sim entra **acordo/convenção coletiva** (FAQ 13–14) — caminho diferente

REP-C (relógio físico homologado) é outro produto; não se aplica se vocês não fabricam esse equipamento.

---

## 3. Passo a passo — registro de programa de computador (INPI)

Ordem prática. Detalhes oficiais: Manual do Usuário e guia e-Software no portal do INPI.

### Passo 0 — Decisões internas

1. **Titular** do direito: em geral a **pessoa jurídica** (CNPJ) que comercializa o software.  
2. **Autores** (pessoas físicas) que desenvolveram — podem ser vários.  
3. **Nome do programa** no formulário (pode ser o nome de produto; alinhar com a marca depois).  
4. **Versão / data** que será registrada (congela um pacote de código).  
5. Garantir **e-CNPJ** (PJ) ou **e-CPF** (PF) **qualificado ICP-Brasil**. Assinatura Gov.br / “avançada” **não** serve no e-Software.

### Passo 1 — Cadastro e-INPI

1. Criar/login no ambiente de peticionamento do INPI (mesmo universo da GRU).  
2. Guardar usuário e senha com cuidado.

### Passo 2 — Preparar o código e o hash

1. Separar um pacote da documentação técnica (código-fonte relevante) em **um** arquivo (ex.: ZIP/RAR) ou arquivo único aceito.  
2. Gerar o **resumo digital hash** desse arquivo (algoritmo indicado no Manual; o hash e o nome do algoritmo vão no formulário).  
3. **Guardar o arquivo original intacto** em mais de um backup. O INPI **não** guarda mais o código; a prova futura depende de você reproduzir o mesmo hash.

### Passo 3 — Pagar a GRU **antes** de protocolar

1. Emitir GRU do serviço de registro de programa de computador (**código 730** — conferir valor vigente na tabela de retribuições).  
2. Pagar a guia. **Não** protocolar com pagamento só agendado: risco de petição “não conhecida”.  
3. Anotar o número da GRU paga.

### Passo 4 — Declaração de Veracidade (DV)

1. Baixar a DV pelo fluxo GRU / e-Software (não recriar PDF do zero: o documento carrega assinatura do INPI).  
2. Assinar **digitalmente** com certificado qualificado:  
   - Titular PJ → **e-CNPJ** da empresa (não o e-CPF do sócio no lugar do CNPJ).  
   - Com procurador → regras do Manual (titular na procuração + procurador na DV).

### Passo 5 — Preencher o e-Software

1. Acessar o peticionamento eletrônico / e-Software.  
2. Informar a **GRU paga**.  
3. Preencher: titular(es), autor(es), dados do programa (título, linguagem, campos do formulário, derivação se for o caso).  
4. Colar o **hash** + identificar o algoritmo.  
5. Anexar a **DV** (e procuração, se houver). Em regra **não** se anexa o código-fonte.  
6. Protocolar e **anotar o número do processo**.

### Passo 6 — Acompanhar

1. Conferir publicação / andamento (RPI / portal).  
2. Prazo típico citado pelo INPI: certificado disponível em até **~10 dias** após depósito com GRU consolidada (sujeito a alteração).  
3. Baixar e arquivar o **certificado** (número no formato do tipo `BR 51 …` — o FAQ do MTE explica como extrair só os dígitos para campos numéricos de AFD/AEJ).

### Passo 7 — Usar o número no produto (REP-P)

Quando o sistema for ofertado/operado como REP-P:

1. Colocar o **número de registro INPI** no **Comprovante de Registro de Ponto do Trabalhador** (art. 79, VII).  
2. Informar o número (só dígitos, conforme FAQ 49) nos leiautes **AFD / AEJ** onde couber.  
3. Cumprir demais requisitos: NSR por estabelecimento, SHA-256 da marcação, assinaturas (ex.: PAdES no PDF do comprovante; CAdES/P7S no AFD conforme FAQ), Anexo IX.  
4. Mudança relevante de versão: avaliar **novo registro** (mercado e suporte costumam tratar alteração substancial como novo certificado — alinhar com assessoria).

---

## 4. Checklist “além do INPI” (não é outro órgão de homologação)

Não é autorização MTE extra, mas **é** trabalho de produto/compliance se a meta for REP-P completo:

- [ ] Comprovante acessível ao trabalhador após cada marcação (e extrato ≥ 48 h)  
- [ ] NSR sequencial por estabelecimento  
- [ ] Hash SHA-256 da marcação no comprovante (REP-P)  
- [ ] AFD no leiaute vigente + assinatura conforme FAQ  
- [ ] AEJ pelo PTRP + assinatura conforme FAQ  
- [ ] Relógio / sincronismo com Hora Legal Brasileira nos limites do Anexo IX  
- [ ] Armazenamento de registro de ponto com os requisitos do Anexo IX  
- [ ] Atestado técnico / termo de responsabilidade onde a Portaria exigir do desenvolvedor  
- [ ] Certificado ICP-Brasil da **empresa desenvolvedora** para assinar AFD/comprovante (FAQ 33/44)

Muitos desses itens ainda são `x` / pendentes no código fiscal atual — o registro INPI **não** completa sozinho o Anexo IX.

---

## 5. Marca (nome do produto) — paralelo opcional

Quando o nome do produto estiver escolhido:

1. Busca de anterioridade na base de marcas do INPI.  
2. Pedido de registro de marca (classe adequada, em geral software/serviços de TI / gestão).  
3. Isso **não** substitui o registro de programa nem o Anexo IX.

---

## 6. Ordem sugerida para o time

1. Fechar se o posicionamento comercial é **REP-P** (padrão sem ACT) ou **REP-A** (com coletivo).  
2. Gap analysis Anexo IX × código atual (comprovante, NSR, hash, P7S, HLB, etc.).  
3. Escolher nome → marca (opcional) + título no e-Software.  
4. Protocolar **registro de programa** do núcleo REP-P.  
5. Embutir número INPI em comprovante/AFD.  
6. Só então tratar “pronto para fiscalização REP-P” em material comercial.

---

## 7. Respostas diretas

**“Preciso registrar no INPI?”**  
Se forem **REP-P**: sim, registro de programa de computador (art. 91).  
Se forem só “tratamento” importando AFD de outro REP: o PTRP em si não exige homologação MTE; o registro INPI do **seu** software ainda é recomendável por propriedade intelectual, e obrigatório se o **seu** núcleo também atuar como REP-P.

**“Por ser coletor + tratamento, preciso de autorização extra?”**  
Não há homologação MTE específica de coletor. O pacote REP-P exige INPI do registrador via programa + Anexo IX. Coletor é peça do SREP; tratamento é PTRP (sem homologação MTE). Autorização coletiva é tema de **REP-A**, não de coletor isolado.
