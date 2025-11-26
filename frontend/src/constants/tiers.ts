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
  [TIERS.NONE]: ['Public X posts (delayed 60m)'],
  [TIERS.SILVER]: ['15-min early access', 'Private Telegram DMs'],
  [TIERS.GOLD]: ['30-min early access', 'Sunday Deep-Dive Thread', 'Advanced signals'],
  [TIERS.DIAMOND]: ['Everything in Gold', 'Unlimited Custom Scans (DM)', 'Instant Alpha'],
};
