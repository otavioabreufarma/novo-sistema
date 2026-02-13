require('dotenv').config();

const axios = require('axios');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:3000',
  timeoutMs: Number(process.env.BACKEND_TIMEOUT_MS || 12000)
};

if (!config.token || !config.clientId) {
  throw new Error('Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env.');
}

const api = axios.create({
  baseURL: config.backendBaseUrl,
  timeout: config.timeoutMs
});

const sessions = new Map();

function getOrCreateSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      server: null,
      steamId64: null,
      steamAuthUrl: null
    });
  }

  return sessions.get(userId);
}

function buildStartEmbed(user) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🛒 Painel de Compra VIP')
    .setDescription(
      [
        `Olá, **${user.username}**!`,
        '',
        'Escolha o servidor para iniciar seu fluxo de compra:',
        '• **Servidor SOLO**',
        '• **Servidor DUO**'
      ].join('\n')
    )
    .setFooter({ text: 'Fluxo seguro: o bot nunca processa pagamentos.' })
    .setTimestamp();
}

function serverButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('server:solo').setLabel('Servidor SOLO').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('server:duo').setLabel('Servidor DUO').setStyle(ButtonStyle.Secondary)
  );
}

function steamStepEmbed(server) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🔗 Vinculação Steam')
    .setDescription(
      [
        `Servidor selecionado: **${String(server).toUpperCase()}**`,
        '',
        '1) Clique em **Vincular Steam** para gerar o link OpenID.',
        '2) Faça login na Steam no link recebido.',
        '3) Clique em **Confirmar SteamID** e informe seu SteamID64.'
      ].join('\n')
    );
}

function steamButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('steam:start').setLabel('Vincular Steam').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('steam:confirm').setLabel('Confirmar SteamID').setStyle(ButtonStyle.Primary)
  );
}

function buyEmbed(server, steamId64) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('✅ Steam vinculada com sucesso')
    .setDescription(
      [
        `Servidor: **${String(server).toUpperCase()}**`,
        `SteamID64: \`${steamId64}\``,
        '',
        'Agora selecione o pacote desejado:'
      ].join('\n')
    );
}

function buyButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('buy:vip').setLabel('Comprar VIP').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('buy:vip+').setLabel('Comprar VIP+').setStyle(ButtonStyle.Danger)
  );
}

function checkoutModal(vipType) {
  return new ModalBuilder()
    .setCustomId(`checkout:${vipType}`)
    .setTitle(`Checkout ${vipType.toUpperCase()}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('name').setLabel('Nome completo').setRequired(true).setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('email').setLabel('E-mail').setRequired(true).setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('phone').setLabel('Telefone').setRequired(true).setStyle(TextInputStyle.Short)
      )
    );
}

function steamConfirmModal() {
  return new ModalBuilder()
    .setCustomId('steam:confirm:modal')
    .setTitle('Confirmar SteamID64')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('steamId64')
          .setLabel('SteamID64 (17 dígitos)')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(17)
          .setStyle(TextInputStyle.Short)
      )
    );
}

function getVipMetadata(vipType) {
  if (vipType === 'vip') {
    return { amount: 49.9, description: 'VIP - 30 dias' };
  }

  return { amount: 89.9, description: 'VIP+ - 30 dias' };
}

async function registerSlashCommand() {
  const command = new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Abrir a interface visual de compra de VIP');

  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationCommands(config.clientId), { body: [command.toJSON()] });
}

function extractCheckoutUrl(checkoutPayload) {
  if (!checkoutPayload || typeof checkoutPayload !== 'object') {
    return null;
  }

  return (
    checkoutPayload.url ||
    checkoutPayload.checkoutUrl ||
    checkoutPayload.checkout_url ||
    checkoutPayload.paymentUrl ||
    checkoutPayload.payment_url ||
    null
  );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  await registerSlashCommand();
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'loja') {
      const session = getOrCreateSession(interaction.user.id);
      session.server = null;
      session.steamId64 = null;
      session.steamAuthUrl = null;

      await interaction.reply({
        embeds: [buildStartEmbed(interaction.user)],
        components: [serverButtons()],
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton()) {
      const session = getOrCreateSession(interaction.user.id);

      if (interaction.customId.startsWith('server:')) {
        session.server = interaction.customId.split(':')[1];
        session.steamId64 = null;

        await interaction.update({
          embeds: [steamStepEmbed(session.server)],
          components: [steamButtons()]
        });
        return;
      }

      if (interaction.customId === 'steam:start') {
        if (!session.server) {
          await interaction.reply({ content: 'Selecione o servidor antes de vincular a Steam.', ephemeral: true });
          return;
        }

        const response = await api.get('/api/auth/steam');
        session.steamAuthUrl = response.data.authUrl;

        const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('🌐 Link de autenticação Steam gerado')
          .setDescription('Clique no botão abaixo para autenticar sua conta Steam via OpenID.')
          .setFooter({ text: 'Após login, volte e confirme o SteamID64.' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Autenticar na Steam').setStyle(ButtonStyle.Link).setURL(session.steamAuthUrl)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
      }

      if (interaction.customId === 'steam:confirm') {
        if (!session.server) {
          await interaction.reply({ content: 'Selecione o servidor primeiro.', ephemeral: true });
          return;
        }

        await interaction.showModal(steamConfirmModal());
        return;
      }

      if (interaction.customId.startsWith('buy:')) {
        if (!session.server || !session.steamId64) {
          await interaction.reply({
            content: 'Você precisa vincular a Steam antes de criar checkout.',
            ephemeral: true
          });
          return;
        }

        const vipType = interaction.customId.split(':')[1];
        await interaction.showModal(checkoutModal(vipType));
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      const session = getOrCreateSession(interaction.user.id);

      if (interaction.customId === 'steam:confirm:modal') {
        const steamId64 = interaction.fields.getTextInputValue('steamId64').trim();

        if (!/^\d{17}$/.test(steamId64)) {
          await interaction.reply({
            content: 'SteamID64 inválido. Informe exatamente 17 dígitos numéricos.',
            ephemeral: true
          });
          return;
        }

        await api.post('/api/auth/link-discord-steam', {
          server: session.server,
          discordId: interaction.user.id,
          steamId64
        });

        session.steamId64 = steamId64;

        await interaction.reply({
          embeds: [buyEmbed(session.server, steamId64)],
          components: [buyButtons()],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith('checkout:')) {
        const vipType = interaction.customId.split(':')[1];
        const customer = {
          name: interaction.fields.getTextInputValue('name').trim(),
          email: interaction.fields.getTextInputValue('email').trim(),
          phone: interaction.fields.getTextInputValue('phone').trim()
        };

        const { amount, description } = getVipMetadata(vipType);

        const checkoutResponse = await api.post('/api/checkout', {
          server: session.server,
          steamId64: session.steamId64,
          discordId: interaction.user.id,
          vipType,
          customer,
          amount,
          description
        });

        const checkoutUrl = extractCheckoutUrl(checkoutResponse.data.checkout);
        if (!checkoutUrl) {
          await interaction.reply({
            content: 'Checkout criado, mas não recebi URL de pagamento do backend.',
            ephemeral: true
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle(`💳 Checkout ${vipType.toUpperCase()} criado`) 
          .setDescription(
            [
              `Pedido: \`${checkoutResponse.data.orderNsu}\``,
              `Servidor: **${String(session.server).toUpperCase()}**`,
              `SteamID64: \`${session.steamId64}\``,
              '',
              'Use o botão abaixo para concluir o pagamento na InfinitePay.'
            ].join('\n')
          )
          .setFooter({ text: 'Pagamento processado exclusivamente pela InfinitePay.' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Pagar agora').setStyle(ButtonStyle.Link).setURL(checkoutUrl)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    }
  } catch (error) {
    const message = error?.response?.data?.error || error.message || 'Erro inesperado.';

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Não foi possível concluir a ação: ${message}`,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `❌ Não foi possível concluir a ação: ${message}`,
      ephemeral: true
    });
  }
});

client.login(config.token);
