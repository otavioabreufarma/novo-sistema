# Bot Discord de Painel VIP

Bot em `discord.js v14` que cria automaticamente um painel fixo no canal configurado ao iniciar.

## Fluxo
1. No `ready`, busca/edita o painel existente via `panel.json`.
2. Se não existir, cria um novo painel com:
   - select de servidor
   - botão de vincular Steam
   - botões de compra VIP e VIP+
3. Toda ação chama o backend por HTTP com `Authorization: Bearer BOT_API_TOKEN`.

## Configuração
```bash
cd bot
cp .env.example .env
npm install
npm start
```

## Variáveis obrigatórias
- `DISCORD_TOKEN`
- `PANEL_CHANNEL_ID`
- `BACKEND_URL`
- `BOT_API_TOKEN`
