require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  StringSelectMenuBuilder
} = require('discord.js');
const { api } = require('./services/api');

const panelStatePath = path.resolve(process.cwd(), 'panel.json');

const config = {
  token: process.env.DISCORD_TOKEN,
  panelChannelId: process.env.PANEL_CHANNEL_ID
};

if (!config.token || !config.panelChannelId || !process.env.BACKEND_URL || !process.env.BOT_API_TOKEN) {
  throw new Error('Defina DISCORD_TOKEN, PANEL_CHANNEL_ID, BACKEND_URL e BOT_API_TOKEN no .env.');
}

function buildPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Painel VIP')
    .setDescription('Selecione seu servidor, vincule sua Steam e inicie sua compra de VIP.')
    .setFooter({ text: 'As regras de negócio são processadas pelo backend.' })
    .setTimestamp();

  const serverSelect = new StringSelectMenuBuilder()
    .setCustomId('select_servidor')
    .setPlaceholder('Selecione o servidor')
    .addOptions([
      { label: 'Servidor SOLO', value: 'solo' },
      { label: 'Servidor DUO', value: 'duo' }
    ]);

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vincular_steam').setLabel('Vincular Steam').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('comprar_vip').setLabel('Comprar VIP').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('comprar_vip_plus').setLabel('Comprar VIP+').setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(serverSelect), actions]
  };
}

async function readPanelState() {
  try {
    const raw = await fs.readFile(panelStatePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writePanelState(state) {
  await fs.writeFile(panelStatePath, JSON.stringify(state, null, 2));
}

async function restoreOrCreatePanel(client) {
  const channel = await client.channels.fetch(config.panelChannelId);
  if (!channel?.isTextBased()) {
    throw new Error('PANEL_CHANNEL_ID não pertence a um canal de texto.');
  }

  const panel = buildPanel();
  const state = await readPanelState();

  if (state.messageId) {
    try {
      const message = await channel.messages.fetch(state.messageId);
      await message.edit(panel);
      return;
    } catch {
      // mensagem antiga apagada: cria nova abaixo
    }
  }

  const message = await channel.send(panel);
  await writePanelState({ messageId: message.id, channelId: channel.id });
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  await restoreOrCreatePanel(client);
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_servidor') {
      const server = interaction.values[0];
      await api.post('/user/server', {
        discordId: interaction.user.id,
        server
      });

      await interaction.reply({
        content: `Servidor **${server.toUpperCase()}** salvo com sucesso.`,
        ephemeral: true
      });
      return;
    }

    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId === 'vincular_steam') {
      const response = await api.post('/steam/link', { discordId: interaction.user.id });
      await interaction.reply({
        content: `Vincule sua Steam aqui: ${response.data.url}`,
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === 'comprar_vip' || interaction.customId === 'comprar_vip_plus') {
      const type = interaction.customId === 'comprar_vip' ? 'vip' : 'vip_plus';
      const response = await api.post('/vip/purchase', {
        discordId: interaction.user.id,
        type
      });

      await interaction.reply({
        content: `Pagamento ${type.toUpperCase()} criado: ${response.data.paymentUrl}`,
        ephemeral: true
      });
    }
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      'Não foi possível concluir sua solicitação agora. Tente novamente em instantes.';

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: `❌ ${message}`, ephemeral: true });
      return;
    }

    await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
  }
});

client.login(config.token);
