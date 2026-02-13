# Backend Express para painel VIP

Backend em Express que centraliza as regras de negócio do bot.

## Endpoints para o bot
Todos os endpoints abaixo exigem `Authorization: Bearer BOT_API_TOKEN` (exceto webhook):

- `POST /api/user/server`
- `POST /api/steam/link`
- `POST /api/vip/purchase`
- `POST /api/vip/webhook`

## Modelo de usuário
```js
{
  discordId: "string",
  server: "solo | duo | null",
  steamId: "string | null",
  vip: "vip | vip_plus | null",
  vipExpiresAt: "Date | null"
}
```

Os dados ficam em `src/data/users.json`.

## Configuração
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
