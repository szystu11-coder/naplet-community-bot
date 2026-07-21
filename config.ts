import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1, "Brakuje DISCORD_TOKEN"),
  CLIENT_ID: z.string().regex(/^\d+$/, "CLIENT_ID musi być identyfikatorem Discorda"),
  GUILD_ID: z.string().regex(/^\d+$/, "GUILD_ID musi być identyfikatorem Discorda"),
  TICKET_CATEGORY_ID: z.string().regex(/^\d+$/).optional().or(z.literal("")),
  SUPPORT_ROLE_ID: z.string().regex(/^\d+$/).optional().or(z.literal("")),
  VERIFIED_ROLE_ID: z.string().regex(/^\d+$/).optional().or(z.literal("")),
  WELCOME_CHANNEL_ID: z.string().regex(/^\d+$/).optional().or(z.literal("")),
  PORT: z.coerce.number().int().positive().default(10000)
});

export const config = schema.parse(process.env);
