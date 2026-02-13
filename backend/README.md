# Backend de VIP para Rust (SOLO + DUO)

Backend único em Node.js para gerenciamento de vendas de VIP com dois bancos JSON independentes (`solo.json` e `duo.json`).

## Requisitos atendidos
- Backend único para servidores SOLO e DUO
- Banco JSON separado por servidor
- Gestão de usuários, VIPs, expiração e histórico de compras
- Integração com Discord bot e plugin do Rust por token de serviço
- Steam OpenID + validação SteamID64 via Steam Web API
- InfinitePay REST direto para checkout + webhook de confirmação

## Instalação
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Variáveis de ambiente
- `PORT`
- `BASE_URL`
- `DISCORD_BOT_TOKEN`
- `RUST_PLUGIN_TOKEN`
- `STEAM_API_KEY`
- `INFINITEPAY_API_TOKEN`
- `INFINITEPAY_WEBHOOK_SECRET`

## Estrutura
- `src/data/solo.json`: base de dados JSON do servidor SOLO.
- `src/data/duo.json`: base de dados JSON do servidor DUO.
- `src/controllers`: regras de negócio dos endpoints.
- `src/services`: integrações (Steam, InfinitePay, VIP).
- `src/routes`: roteamento REST.

## Fluxo de compra
1. Cliente chama `POST /api/checkout`.
2. Backend cria `order_nsu` único e registra compra `pending_payment`.
3. Backend cria checkout na InfinitePay (`/invoices/public/checkout/links`).
4. InfinitePay envia webhook em `POST /api/webhooks/infinitepay`.
5. Pagamento confirmado -> compra vira `paid` e VIP é liberado automaticamente.

## Endpoints REST
### Saúde
- `GET /api/health`

### Steam
- `GET /api/auth/steam` - retorna URL OpenID para login Steam.
- `GET /api/auth/steam/return` - callback OpenID.
- `POST /api/auth/link-discord-steam` - salva vínculo Discord ↔ Steam.

### Checkout e pagamentos
- `POST /api/checkout`
- `POST /api/webhooks/infinitepay`

### Consultas de servidor
- `GET /api/servers/:server/users?steamId64=...`
- `GET /api/servers/:server/purchases`

### Integrações
- `GET /api/plugin/:server/vip-status?steamId64=...` (header `x-service-token` do plugin)
- `GET /api/discord/:server/users?steamId64=...` (header `x-service-token` do bot)

## Segurança e validação
- Validação com Joi em body/params/query.
- Middleware de token para integrações bot/plugin.
- `helmet` + `morgan`.
- Verificação opcional de assinatura HMAC para webhook da InfinitePay.
