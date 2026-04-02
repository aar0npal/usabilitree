import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.string().trim().min(1),
    DATABASE_AUTH_TOKEN: z.string().trim().min(1),
    DISCORD_CLIENT_ID: z.string().trim().min(1),
    DISCORD_CLIENT_SECRET: z.string().trim().min(1),
    DISCORD_BOT_TOKEN: z.string().trim().min(1),
    GOOGLE_CLIENT_ID: z.string().trim().min(1),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
    SECRET_HASH: z.string().trim().min(1),
    MOCK_SEND_EMAIL: z.enum(["true", "false"]).transform((v) => v === "true"),
    SENDGRID_API_KEY: z.string().trim().min(1),
    EMAIL_SENDER: z.string().trim().min(1),
    SMTP_HOST: z.string().trim().min(1),
    SMTP_PORT: z.number().int().min(1),
    SMTP_USER: z.string().trim().min(1),
    SMTP_PASSWORD: z.string().trim().min(1),
    STUDY_LIMIT: z.number().int().min(0).default(3),
    // Creem integration — optional in development so the app can boot
    // without payments fully configured. For production, set real values.
    CREEM_API_KEY: z.string().trim().min(1).optional(),
    CREEM_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CREEM_TEST_MODE: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    NEXT_PUBLIC_CREEM_PRODUCT_ID: z.string().trim().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().trim().min(1),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_CREEM_TEST_MODE: process.env.NEXT_PUBLIC_CREEM_TEST_MODE,
    NEXT_PUBLIC_CREEM_PRODUCT_ID: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SECRET_HASH: process.env.SECRET_HASH,
    MOCK_SEND_EMAIL: process.env.MOCK_SEND_EMAIL,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    EMAIL_SENDER: process.env.EMAIL_SENDER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT ?? ""),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    STUDY_LIMIT: parseInt(process.env.STUDY_LIMIT ?? ""),
    CREEM_API_KEY: process.env.CREEM_API_KEY,
    CREEM_WEBHOOK_SECRET: process.env.CREEM_WEBHOOK_SECRET,
  },
  emptyStringAsUndefined: true,
});
