# sistemaponto

Sistema de jornada e ponto. A senha fica no autenticador. Esta API guarda a empresa, o vínculo e a sessão deste sistema.

```
backend/     API
frontend/    site de gestão
mobile/      app do funcionário
```

## Desenvolvimento

PostgreSQL local ao autenticador. Não use Docker para desenvolver.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn main:app --reload --port 8003
```

O `.env` precisa de `AUTHENTICATOR_API_KEY` igual à do autenticador. O seed liga a primeira empresa à pessoa admin que já existe lá, sem copiar a senha. A URL deste site (`http://localhost:5175`) precisa estar na `REDIRECT_ALLOWLIST` do autenticador.

```bash
cd frontend
npm install
npm run dev
```

O site fica em `http://localhost:5175` e fala com a API pelo proxy `/api`.

```bash
cd mobile
flutter pub get
flutter run
```

O app chama `API_URL` direto, com Bearer.

## Produção

O site e `/api` ficam no mesmo host. Desenvolvimento continua na máquina.
