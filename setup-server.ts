import { ChannelType, Client, Events, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

    const verifiedRole = guild.roles.cache.find((role) => role.name.includes("WIDZ"));
    if (!verifiedRole) throw new Error("Nie znaleziono roli WIDZ.");

    const botMember = await guild.members.fetch(client.user!.id);
    const botAccess = {
      ViewChannel: true,
      SendMessages: true,
      EmbedLinks: true,
      ReadMessageHistory: true
    };

    let ticketCategory = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name === "🎫・TICKETY"
    );
    if (
      !ticketCategory ||
      ticketCategory.type !== ChannelType.GuildCategory ||
      !ticketCategory.permissionsFor(botMember).has(PermissionFlagsBits.ViewChannel)
    ) {
      ticketCategory = await guild.channels.create({
        name: "🎫・TICKETY",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: botMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ]
      });
    }
    await ticketCategory.permissionOverwrites.edit(botMember, botAccess);
    await ticketCategory.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });

    const startCategory = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name.includes("START")
    );
    if (!startCategory || startCategory.type !== ChannelType.GuildCategory) {
      throw new Error("Nie znaleziono kategorii START.");
    }
    await startCategory.permissionOverwrites.edit(botMember, botAccess);

    let verificationChannel = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildText && channel.name.includes("weryfikacja")
    );
    if (!verificationChannel || verificationChannel.type !== ChannelType.GuildText) {
      verificationChannel = await guild.channels.create({
        name: "✅・weryfikacja",
        type: ChannelType.GuildText,
        parent: startCategory.id
      });
    } else if (verificationChannel.parentId !== startCategory.id) {
      await verificationChannel.setParent(startCategory.id);
    }
    await verificationChannel.permissionOverwrites.edit(botMember, botAccess);
    await verificationChannel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
      SendMessages: false,
      ReadMessageHistory: true
    });

    for (const category of guild.channels.cache.values()) {
      if (category.type !== ChannelType.GuildCategory) continue;
      if (category.id === startCategory.id || category.id === ticketCategory.id) continue;
      if (!category.permissionsFor(botMember).has(PermissionFlagsBits.ViewChannel)) continue;

      await category.permissionOverwrites.edit(botMember, botAccess);
      await category.permissionOverwrites.edit(verifiedRole, { ViewChannel: true });
      await category.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    }

    console.log(`TICKET_CATEGORY_ID=${ticketCategory.id}`);
    console.log(`VERIFIED_ROLE_ID=${verifiedRole.id}`);
    console.log(`VERIFICATION_CHANNEL_ID=${verificationChannel.id}`);
    console.log(`BOT_HIGHEST_POSITION=${botMember.roles.highest.position}`);
    console.log(`VERIFIED_ROLE_POSITION=${verifiedRole.position}`);
  } finally {
    client.destroy();
  }
});

await client.login(config.DISCORD_TOKEN);
