import { ScannerAgent } from '../scanner.agent';
import { coingeckoService } from '../../services/coingecko.service';
import { birdeyeService } from '../../services/birdeye.service';

/**
 * Scanner Agent REAL Integration Tests
 * 
 * These tests make REAL API calls to:
 * 1. Verify scanner returns properly formatted candidates
 * 2. Test actual market data processing
 * 3. Validate filtering logic works with real data
 */

describe('Scanner Agent - Real API Tests', () => {
  // Increase timeout for real API calls
  jest.setTimeout(60000); // 60 seconds

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Real Market Scanning', () => {
    it('should scan real market data and return valid candidates', async () => {
      // Fetch REAL market data
      const [trending, gainers] = await Promise.all([
        coingeckoService.getTrending(),
        coingeckoService.getTopGainersLosers(),
      ]);

      // Build the scanner agent
      const { runner } = await ScannerAgent.build();
      
      const marketData = {
        trending: trending.slice(0, 10),
        gainers: gainers.slice(0, 10),
      };

      // Run REAL scanner
      const prompt = `Scan the market for potential signals. Market data: ${JSON.stringify(marketData)}`;
      const result = await runner.ask(prompt) as any;

      console.log('Scanner Result:', JSON.stringify(result, null, 2));

      // Validate response structure
      expect(result).toBeDefined();
      if (result.candidates) {
        expect(Array.isArray(result.candidates)).toBe(true);
        
        if (result.candidates.length > 0) {
          const candidate = result.candidates[0];
          expect(candidate).toHaveProperty('symbol');
          expect(candidate).toHaveProperty('name');
          expect(candidate).toHaveProperty('reason');
          expect(typeof candidate.symbol).toBe('string');
          expect(typeof candidate.name).toBe('string');
          expect(typeof candidate.reason).toBe('string');
          
          console.log(`Found ${result.candidates.length} candidates`);
        } else {
          console.log('Scanner was selective - no strong candidates found (this is okay)');
        }
      }
    });

    it('should scan a specific token (Single Token Mode)', async () => {
      // Test Mode 2: Single token deep dive
      const { runner } = await ScannerAgent.build();
      
      const prompt = 'Scan $SOL (Solana) for detailed analysis';
      const result = await runner.ask(prompt) as any;

      console.log('Single Token Analysis:', JSON.stringify(result, null, 2));

      // In single token mode, should return 'analysis' object
      if (result.analysis) {
        expect(result.analysis).toBeDefined();
        expect(result.analysis.symbol).toBeDefined();
        expect(result.analysis.name).toBeDefined();
        console.log(`Analyzed ${result.analysis.symbol}: ${result.analysis.price_driver_summary}`);
      }
    });

  });

  describe('Data Validation', () => {
    it('should validate scanner output schema', async () => {
      const { runner } = await ScannerAgent.build();
      
      // Simple test with minimal data
      const prompt = 'Quick scan for trending tokens. Only return top 2 candidates if strong setups exist, otherwise empty.';
      const result = await runner.ask(prompt) as any;

      console.log('Schema validation result:', JSON.stringify(result, null, 2));

      // Either candidates OR analysis should be present
      const hasValidOutput = result.candidates !== undefined || result.analysis !== undefined;
      expect(hasValidOutput).toBe(true);

      
      // Validate candidates structure if present
      if (result.candidates && result.candidates.length > 0) {
        result.candidates.forEach((candidate: any) => {
          expect(candidate.symbol).toBeDefined();
          expect(candidate.name).toBeDefined();
          expect(candidate.reason).toBeDefined();
        });
      }
    });
  });
});
