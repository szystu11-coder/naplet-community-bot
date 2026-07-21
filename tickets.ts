import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import { config } from "./config.js";

const createId = "ticket:create";
const closeId = "ticket:close";

export function ticketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("Potrzebujesz pomocy?")
    .setDescription("Kliknij przycisk poniżej, aby otworzyć prywatny ticket z administracją.");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(createId).setLabel("Otwórz ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

function safeChannelName(username: string) {
  return `ticket-${username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "uzytkownik"}`;
}

async function createTicket(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  const existing = interaction.guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.topic === `ticket-owner:${interaction.user.id}`
  );
  if (existing) {
    await interaction.reply({ content: `Masz już otwarty ticket: ${existing}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const overwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  if (config.SUPPORT_ROLE_ID) {
    overwrites.push({
      id: config.SUPPORT_ROLE_ID,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: safeChannelName(interaction.user.username),
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID || undefined,
    topic: `ticket-owner:${interaction.user.id}`,
    permissionOverwrites: overwrites
  });

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(closeId).setLabel("Zamknij ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${interaction.user}${config.SUPPORT_ROLE_ID ? ` <@&${config.SUPPORT_ROLE_ID}>` : ""}`,
    embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("Ticket otwarty").setDescription("Opisz dokładnie, w czym możemy pomóc.")],
    components: [closeRow]
  });
  await interaction.reply({ content: `Utworzono ${channel}.`, flags: MessageFlags.Ephemeral });
}

async function closeTicket(interaction: ButtonInteraction) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) return;

  const ownerId = interaction.channel.topic?.replace("ticket-owner:", "");
  const canClose = ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!canClose) {
    await interaction.reply({ content: "Nie możesz zamknąć tego ticketu.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.update({ components: [] });
  await interaction.channel.permissionOverwrites.edit(ownerId ?? interaction.user.id, {
    SendMessages: false,
    ViewChannel: false
  });
  await interaction.channel.setName(`zamkniety-${interaction.channel.name.replace(/^ticket-/, "")}`);
  await interaction.channel.send("Ticket został zamknięty. Administracja może go teraz sprawdzić i usunąć.");
}

export async function handleTicketButton(interaction: ButtonInteraction) {
  if (interaction.customId === createId) return createTicket(interaction);
  if (interaction.customId === closeId) return closeTicket(interaction);
}
