export const TIERS = {
  NONE: 'NONE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  DIAMOND: 'DIAMOND',
} as const;

export type Tier = keyof typeof TIERS;

export const TIER_THRESHOLDS = {
  SILVER: 10, // 10 RGE
  GOLD: 100,  // 100 RGE
  DIAMOND: 1000, // 1,000 RGE
};

export const TIER_BENEFITS = {
  [TIERS.NONE]: ['Select signals on X (delayed 30m)', 'Dashboard access'],
  [TIERS.SILVER]: ['100% signal coverage via Telegram', '15 min early access', 'Private Telegram DMs'],
  [TIERS.GOLD]: ['100% signal coverage via Telegram', 'Immediate access', 'Sunday Deep-Dive Thread', 'Advanced signals'],
  [TIERS.DIAMOND]: ['100% signal coverage via Telegram', 'Everything in Gold', 'Unlimited Custom Scans (DM)', 'Instant Alpha'],
};
