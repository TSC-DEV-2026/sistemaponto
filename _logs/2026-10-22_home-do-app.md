# Log — home do app em opções

**Data:** 2026-10-22  
**Sessão:** adição de feature

---

## ✅ O que foi feito

- Depois de registrar, no simples, no QR Code ou no facial, o aplicativo mostra na hora se o ponto entrou ou a falha, com a mensagem da API. O aviso fica acima das opções, antes da lista do mês.
- A home separa Registro, Apuração do mês, Marcações e Banco de horas. O registro mostra só o tipo da ficha.
- Sem rede, a sessão já guardada permanece e a tela abre. O reconhecimento facial usa o embedding local e deixa a marcação na fila do aparelho.
- Jornada, apuração, marcações e banco podem falhar ao carregar. Essa falha fica na opção correspondente e não esconde o registro facial.

## 📁 Arquivos criados

- `mobile/lib/data/network/stored_session.dart` — cópia da sessão para abrir sem rede
- `mobile/test/stored_session_test.dart` — a cópia volta com o mesmo vínculo, e só 401 e 403 apagam a sessão
- `_logs/2026-10-22_home-do-app.md` — este registro

## ✏️ Arquivos modificados

- `mobile/lib/data/network/token_store.dart` — guarda a sessão e o cadastro do funcionário junto dos tokens
- `mobile/lib/data/network/dio_client.dart` — limite de espera para a abertura não ficar parada sem rede
- `mobile/lib/features/auth/providers/auth_provider.dart` — sem rede, a sessão guardada permanece
- `mobile/lib/features/auth/presentation/screens/boot_screen.dart` — a abertura mostra o indicador em vez da tela vazia
- `mobile/lib/app/router.dart` — sessão sem o perfil carregado abre a home
- `mobile/lib/features/app/presentation/screens/home_screen.dart` — as quatro opções e o aviso da marcação
- `mobile/lib/features/app/data/clock_flow.dart` — o resultado do QR volta para a home
- `mobile/lib/features/app/presentation/screens/qr_punch_screen.dart` — sucesso e falha voltam para o aviso da home

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- —

## ⚠️ Decisões tomadas

- A sessão só é apagada em 401 e 403. Falta de rede e falha do servidor mantêm o token e a cópia guardada.
- O cadastro usado no registro offline é o da última abertura com rede. A primeira abertura desta versão, se a pessoa já estava logada, precisa de rede uma vez para gravar essa cópia.
- Apuração, marcações e banco só carregam quando a opção é aberta.

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- O aplicativo não foi aberto no celular. A checagem foi o analisador e os testes do Flutter.
