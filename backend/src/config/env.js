const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  discordBotToken: process.env.DISCORD_BOT_TOKEN || '',
  botApiToken: process.env.BOT_API_TOKEN || '',
  rustPluginToken: process.env.RUST_PLUGIN_TOKEN || '',
  steamApiKey: process.env.STEAM_API_KEY || '',
  infinitePayApiToken: process.env.INFINITEPAY_API_TOKEN || '',
  infinitePayWebhookSecret: process.env.INFINITEPAY_WEBHOOK_SECRET || '',
  dataDir: path.resolve(process.cwd(), 'src/data')
};

module.exports = { env };
