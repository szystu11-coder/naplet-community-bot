import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ticketPanel } from "./tickets.js";
import { verificationPanel } from "./verification.js";

export type Command = {
  data: {
    name: string;
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Sprawdza, czy bot działa"),
  async execute(interaction) {
    await interaction.reply({ content: `Pong! ${interaction.client.ws.ping} ms`, flags: MessageFlags.Ephemeral });
  }
};

const server: Command = {
  data: new SlashCommandBuilder()
    .setName("serwer")
    .setDescription("Wyświetla informacje o serwerze"),
  async execute(interaction) {
    if (!interaction.guild) return void (await interaction.reply({ content: "Ta komenda działa tylko na serwerze.", flags: MessageFlags.Ephemeral }));

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(interaction.guild.name)
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: "Członkowie", value: String(interaction.guild.memberCount), inline: true },
        { name: "Utworzony", value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:D>`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};

const clear: Command = {
  data: new SlashCommandBuilder()
    .setName("wyczysc")
    .setDescription("Usuwa ostatnie wiadomości z kanału")
    .addIntegerOption((option) =>
      option.setName("liczba").setDescription("Od 1 do 100 wiadomości").setMinValue(1).setMaxValue(100).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger("liczba", true);
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      return void (await interaction.reply({ content: "Tej komendy można użyć tylko na kanale tekstowym.", flags: MessageFlags.Ephemeral }));
    }

    const deleted = await channel.bulkDelete(amount, true);
    await interaction.reply({ content: `Usunięto ${deleted.size} wiadomości.`, flags: MessageFlags.Ephemeral });
  }
};

const setupTicket: Command = {
  data: new SlashCommandBuilder()
    .setName("panel-ticket")
    .setDescription("Publikuje panel do otwierania ticketów")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    if (interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Tej komendy można użyć tylko na kanale tekstowym.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.channel.send(ticketPanel());
    await interaction.reply({ content: "Panel ticketów został opublikowany.", flags: MessageFlags.Ephemeral });
  }
};

const setupVerification: Command = {
  data: new SlashCommandBuilder()
    .setName("panel-weryfikacja")
    .setDescription("Publikuje panel weryfikacji")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Tej komendy można użyć tylko na kanale tekstowym.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.channel.send(verificationPanel());
    await interaction.reply({ content: "Panel weryfikacji został opublikowany.", flags: MessageFlags.Ephemeral });
  }
};

export const commands = [ping, server, clear, setupTicket, setupVerification];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
