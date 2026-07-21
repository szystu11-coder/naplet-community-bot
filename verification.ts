import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} from "discord.js";
import { config } from "./config.js";

const verificationId = "verification:claim";

export function verificationPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Weryfikacja")
    .setDescription(
      "Kliknij przycisk poniżej, aby otrzymać rangę **✅・WIDZ** i odblokować dostęp do serwera."
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(verificationId)
      .setLabel("Zweryfikuj się")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

export async function handleVerificationButton(interaction: ButtonInteraction) {
  if (!interaction.guild || !config.VERIFIED_ROLE_ID) {
    await interaction.reply({
      content: "Weryfikacja nie została jeszcze skonfigurowana.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (member.roles.cache.has(config.VERIFIED_ROLE_ID)) {
    await interaction.reply({ content: "Jesteś już zweryfikowany.", flags: MessageFlags.Ephemeral });
    return;
  }

  await member.roles.add(config.VERIFIED_ROLE_ID, "Weryfikacja przyciskiem");
  await interaction.reply({
    content: "Gotowe! Otrzymałeś rangę **✅・WIDZ** i dostęp do serwera.",
    flags: MessageFlags.Ephemeral
  });
}
