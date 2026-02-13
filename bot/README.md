# Bot Discord de Loja VIP (UI)

Bot em `discord.js` que cria uma experiência visual de compra no Discord, delegando autenticação Steam e criação de checkout ao backend.

## Fluxo implementado
1. `/loja` abre painel com escolha de servidor (**SOLO** ou **DUO**).
2. Após escolher, exibe ações para vincular Steam.
3. `Vincular Steam` busca `GET /api/auth/steam` e envia botão com link OpenID.
4. `Confirmar SteamID` abre modal e salva vínculo com `POST /api/auth/link-discord-steam`.
5. Após vínculo, libera botões `Comprar VIP` e `Comprar VIP+`.
6. Compra abre modal de cliente e chama `POST /api/checkout`, retornando botão com URL de pagamento.

> O bot **não processa pagamento**. Ele apenas apresenta a UI e integra com o backend via API.

## Configuração
```bash
cd bot
cp .env.example .env
npm install
npm start
```

## Variáveis de ambiente
- `DISCORD_TOKEN`: token do bot.
- `CLIENT_ID`: application ID do bot no Discord.
- `BACKEND_BASE_URL`: URL base do backend (padrão: `http://localhost:3000`).
- `BACKEND_TIMEOUT_MS`: timeout HTTP para API.
