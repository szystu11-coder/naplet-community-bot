import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
  body: commands.map((command) => command.data.toJSON())
});

console.log(`Zarejestrowano ${commands.length} komendy na serwerze ${config.GUILD_ID}.`);
