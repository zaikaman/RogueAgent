/**
 * CoinGecko ID Mapping for Tradeable Tokens
 * 
 * This module re-exports the CoinGecko mappings from the unified tradeable-tokens constant
 * to maintain backward compatibility while eliminating duplicate data.
 * 
 * The source of truth is now TRADEABLE_TOKENS in tradeable-tokens.constant.ts
 */

import { SYMBOL_TO_COINGECKO, TRADEABLE_TOKENS_MAP } from './tradeable-tokens.constant';

// Re-export for backward compatibility
export const SYMBOL_TO_COINGECKO_ID = SYMBOL_TO_COINGECKO;

/**
 * Get the CoinGecko ID for a given symbol
 * Falls back to lowercase symbol if no mapping exists
 */
export function getCoingeckoId(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().replace(/USDT$/, '').replace(/-PERP$/, '');
  return SYMBOL_TO_COINGECKO_ID[upperSymbol] || symbol.toLowerCase();
}

/**
 * Check if we have a known CoinGecko mapping for a symbol
 */
export function hasCoingeckoMapping(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase().replace(/USDT$/, '').replace(/-PERP$/, '');
  return upperSymbol in SYMBOL_TO_COINGECKO_ID;
}
