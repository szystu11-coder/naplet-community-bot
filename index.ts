import { Client, EmbedBuilder, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { commandMap } from "./commands.js";
import { config } from "./config.js";
import { startHealthServer } from "./health.js";
import { handleTicketButton } from "./tickets.js";
import { handleVerificationButton } from "./verification.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

startHealthServer(config.PORT);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot zalogowany jako ${readyClient.user.tag}.`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!config.WELCOME_CHANNEL_ID || member.guild.id !== config.GUILD_ID || member.user.bot) return;

  const channel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID);
  if (!channel?.isTextBased() || channel.isDMBased()) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("Witamy na Axifek community!")
    .setDescription(`Hej ${member}, milo Cie widziec na serwerze Axifka!\n\nPrzeczytaj regulamin i kliknij przycisk na kanale weryfikacji, aby odblokowac caly serwer.`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Jestes ${member.guild.memberCount}. osoba na serwerze` })
    .setTimestamp();

  await channel.send({ embeds: [welcomeEmbed] });
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket:")) {
      await handleTicketButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "verification:claim") {
      await handleVerificationButton(interaction);
    }
  } catch (error) {
    console.error(error);
    const message = { content: "Wystąpił błąd podczas wykonywania tej akcji.", flags: MessageFlags.Ephemeral } as const;
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) await interaction.followUp(message);
      else await interaction.reply(message);
    }
  }
});

await client.login(config.DISCORD_TOKEN);
