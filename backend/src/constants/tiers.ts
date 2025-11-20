export const TIERS = {
  NONE: 'NONE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  DIAMOND: 'DIAMOND',
} as const;

export type Tier = keyof typeof TIERS;

export const TIER_THRESHOLDS = {
  SILVER: 100, // $100 worth of RGE
  GOLD: 1000,  // $1,000 worth of RGE
  DIAMOND: 5000, // $5,000 worth of RGE
};
