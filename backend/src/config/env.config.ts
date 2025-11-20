import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  TWITTER_API_KEY: z.string().optional(),
  TWITTERIO_API_KEY: z.string().optional(),
  TWITTER_LOGIN_COOKIES: z.string().optional(),
  TWITTER_PROXY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHANNEL_ID: z.string().optional(),
  FRAXTAL_RPC_URL: z.string().url().default('https://rpc.frax.com'),
  COINGECKO_API_KEY: z.string().optional(),
  MORALIS_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  BIRDEYE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://gpt1.shupremium.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  SCANNER_API_KEY: z.string().optional(),
  SCANNER_BASE_URL: z.string().optional(),
  SCANNER_MODEL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RUN_INTERVAL_MINUTES: z.string().transform(Number).default('60'),
});

export type EnvConfig = z.infer<typeof envSchema>;

const processEnv = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  TWITTERIO_API_KEY: process.env.TWITTERIO_API_KEY,
  TWITTER_LOGIN_COOKIES: process.env.TWITTER_LOGIN_COOKIES,
  TWITTER_PROXY: process.env.TWITTER_PROXY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
  FRAXTAL_RPC_URL: process.env.FRAXTAL_RPC_URL,
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  MORALIS_API_KEY: process.env.MORALIS_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SCANNER_API_KEY: process.env.SCANNER_API_KEY,
  SCANNER_BASE_URL: process.env.SCANNER_BASE_URL,
  SCANNER_MODEL: process.env.SCANNER_MODEL,
  NODE_ENV: process.env.NODE_ENV,
  RUN_INTERVAL_MINUTES: process.env.RUN_INTERVAL_MINUTES,
};

const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  // In production we might want to exit, but for dev/setup we can warn
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = parsed.success ? parsed.data : (processEnv as unknown as EnvConfig);
