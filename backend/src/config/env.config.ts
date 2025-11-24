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
  CMC_API_KEY: z.string().optional(),
  RUNWARE_API_KEY: z.string().optional(),
  IQAI_API_KEY: z.string().optional(),
  AGENT_TOKEN_CONTRACT: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://gpt1.shupremium.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  SCANNER_API_KEY: z.string().optional(),
  SCANNER_BASE_URL: z.string().optional(),
  SCANNER_MODEL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RUN_INTERVAL_MINUTES: z.string().transform(Number).default('60'),
  // API Key arrays for round-robin rotation
  COINGECKO_API_KEY_1: z.string().optional(),
  COINGECKO_API_KEY_2: z.string().optional(),
  COINGECKO_API_KEY_3: z.string().optional(),
  COINGECKO_API_KEY_4: z.string().optional(),
  COINGECKO_API_KEY_5: z.string().optional(),
  COINGECKO_API_KEY_6: z.string().optional(),
  COINGECKO_API_KEY_7: z.string().optional(),
  COINGECKO_API_KEY_8: z.string().optional(),
  COINGECKO_API_KEY_9: z.string().optional(),
  COINGECKO_API_KEY_10: z.string().optional(),
  BIRDEYE_API_KEY_1: z.string().optional(),
  BIRDEYE_API_KEY_2: z.string().optional(),
  BIRDEYE_API_KEY_3: z.string().optional(),
  BIRDEYE_API_KEY_4: z.string().optional(),
  BIRDEYE_API_KEY_5: z.string().optional(),
  BIRDEYE_API_KEY_6: z.string().optional(),
  BIRDEYE_API_KEY_7: z.string().optional(),
  BIRDEYE_API_KEY_8: z.string().optional(),
  BIRDEYE_API_KEY_9: z.string().optional(),
  BIRDEYE_API_KEY_10: z.string().optional(),
  CMC_API_KEY_1: z.string().optional(),
  CMC_API_KEY_2: z.string().optional(),
  CMC_API_KEY_3: z.string().optional(),
  CMC_API_KEY_4: z.string().optional(),
  CMC_API_KEY_5: z.string().optional(),
  CMC_API_KEY_6: z.string().optional(),
  CMC_API_KEY_7: z.string().optional(),
  CMC_API_KEY_8: z.string().optional(),
  CMC_API_KEY_9: z.string().optional(),
  CMC_API_KEY_10: z.string().optional(),
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
  CMC_API_KEY: process.env.CMC_API_KEY,
  RUNWARE_API_KEY: process.env.RUNWARE_API_KEY,
  IQAI_API_KEY: process.env.IQAI_API_KEY,
  AGENT_TOKEN_CONTRACT: process.env.AGENT_TOKEN_CONTRACT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SCANNER_API_KEY: process.env.SCANNER_API_KEY,
  SCANNER_BASE_URL: process.env.SCANNER_BASE_URL,
  SCANNER_MODEL: process.env.SCANNER_MODEL,
  NODE_ENV: process.env.NODE_ENV,
  RUN_INTERVAL_MINUTES: process.env.RUN_INTERVAL_MINUTES,
  // API Key arrays for round-robin rotation
  COINGECKO_API_KEY_1: process.env.COINGECKO_API_KEY_1,
  COINGECKO_API_KEY_2: process.env.COINGECKO_API_KEY_2,
  COINGECKO_API_KEY_3: process.env.COINGECKO_API_KEY_3,
  COINGECKO_API_KEY_4: process.env.COINGECKO_API_KEY_4,
  COINGECKO_API_KEY_5: process.env.COINGECKO_API_KEY_5,
  COINGECKO_API_KEY_6: process.env.COINGECKO_API_KEY_6,
  COINGECKO_API_KEY_7: process.env.COINGECKO_API_KEY_7,
  COINGECKO_API_KEY_8: process.env.COINGECKO_API_KEY_8,
  COINGECKO_API_KEY_9: process.env.COINGECKO_API_KEY_9,
  COINGECKO_API_KEY_10: process.env.COINGECKO_API_KEY_10,
  BIRDEYE_API_KEY_1: process.env.BIRDEYE_API_KEY_1,
  BIRDEYE_API_KEY_2: process.env.BIRDEYE_API_KEY_2,
  BIRDEYE_API_KEY_3: process.env.BIRDEYE_API_KEY_3,
  BIRDEYE_API_KEY_4: process.env.BIRDEYE_API_KEY_4,
  BIRDEYE_API_KEY_5: process.env.BIRDEYE_API_KEY_5,
  BIRDEYE_API_KEY_6: process.env.BIRDEYE_API_KEY_6,
  BIRDEYE_API_KEY_7: process.env.BIRDEYE_API_KEY_7,
  BIRDEYE_API_KEY_8: process.env.BIRDEYE_API_KEY_8,
  BIRDEYE_API_KEY_9: process.env.BIRDEYE_API_KEY_9,
  BIRDEYE_API_KEY_10: process.env.BIRDEYE_API_KEY_10,
  CMC_API_KEY_1: process.env.CMC_API_KEY_1,
  CMC_API_KEY_2: process.env.CMC_API_KEY_2,
  CMC_API_KEY_3: process.env.CMC_API_KEY_3,
  CMC_API_KEY_4: process.env.CMC_API_KEY_4,
  CMC_API_KEY_5: process.env.CMC_API_KEY_5,
  CMC_API_KEY_6: process.env.CMC_API_KEY_6,
  CMC_API_KEY_7: process.env.CMC_API_KEY_7,
  CMC_API_KEY_8: process.env.CMC_API_KEY_8,
  CMC_API_KEY_9: process.env.CMC_API_KEY_9,
  CMC_API_KEY_10: process.env.CMC_API_KEY_10,
};

const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  // In production we might want to exit, but for dev/setup we can warn
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const baseConfig = parsed.success ? parsed.data : (processEnv as unknown as EnvConfig);

// Helper to build API key arrays for round-robin rotation
const buildApiKeyArray = (prefix: 'COINGECKO' | 'BIRDEYE' | 'CMC'): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = (baseConfig as any)[`${prefix}_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
};

// Export config with added API key arrays
export const config = {
  ...baseConfig,
  COINGECKO_API_KEYS: buildApiKeyArray('COINGECKO'),
  BIRDEYE_API_KEYS: buildApiKeyArray('BIRDEYE'),
  CMC_API_KEYS: buildApiKeyArray('CMC'),
};
