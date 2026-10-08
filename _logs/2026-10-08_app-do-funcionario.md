# Log — App do funcionário

**Data:** 2026-10-08  
**Sessão:** plano de desenvolvimento no aplicativo, só o uso do funcionário

---

## ✅ O que foi feito

- O botão, o QR Code com selfie e o reconhecimento facial registram o ponto do próprio funcionário
- Falha de código, selfie ou rosto não grava a marcação e permite nova tentativa
- A tela mostra a jornada vigente, as marcações que valem, o histórico, a apuração do mês e o saldo do banco
- A solicitação cobre ajuste do dia, abono, atestado, afastamento e férias
- O atestado pede CID, CRM e nome do médico. A foto é opcional e fica visível para quem pediu
- Os avisos da pessoa podem ser lidos e cada um pode ser desligado
- Fechamento, arquivo fiscal, cobrança, relatório gerencial, aprovação e quitação do banco não entraram no aplicativo

## 📁 Arquivos criados

- `mobile/lib/features/app/data/format.dart` — datas, minutos e rótulos
- `mobile/lib/features/app/presentation/screens/notices_screen.dart` — avisos da pessoa

## ✏️ Arquivos modificados

- `mobile/lib/features/app/presentation/screens/home_screen.dart` — ponto, apuração e banco
- `mobile/lib/features/app/presentation/screens/requests_screen.dart` — solicitações do funcionário
- `mobile/lib/app/router.dart` — rota de avisos
- `mobile/lib/shared/widgets/employee_shell.dart` — navegação do aplicativo
- `mobile/lib/data/network/dio_client.dart` — envio da foto
- `mobile/pubspec.yaml` — câmera para selfie e foto do atestado
- `mobile/android/app/src/main/AndroidManifest.xml` — permissão da câmera
- `mobile/ios/Runner/Info.plist` — texto da câmera e da biblioteca

## 🗑️ Arquivos removidos

- —

## 🔗 Dependências adicionadas

- `image_picker` — selfie do ponto e foto do atestado

## ⚠️ Decisões tomadas

- O aplicativo não opera a gestão. O gestor continua decidindo, fechando e quitando no site
- O QR deste corte continua o texto unidade, CPF e matrícula. A selfie sobe pela API
- O rosto entra quando o aplicativo informa que reconheceu, online ou offline. Reconhecimento falho não grava marcação
- Os avisos desligáveis no aplicativo são os da própria pessoa: aprovada, recusada, cancelada e ponto incompleto

## 🐛 Problemas encontrados e soluções

- —

## 📌 Pendências / próximos passos

- —
