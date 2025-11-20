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
  [TIERS.NONE]: ['Public signals (delayed)'],
  [TIERS.SILVER]: ['15-min early access', 'Basic signals'],
  [TIERS.GOLD]: ['30-min early access', 'Advanced signals', 'Intel threads'],
  [TIERS.DIAMOND]: ['Instant access', 'All signals/intel', '1 Custom request/day'],
};
