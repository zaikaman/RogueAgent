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

export const CONTRACTS = {
  RGE_TOKEN: '0xe5Ee677388a6393d135bEd00213E150b1F64b032',
  FRAXTAL_PLATFORM_ID: 'fraxtal',
};
