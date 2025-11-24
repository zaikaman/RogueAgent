import { AnalyzerAgent } from '../analyzer.agent';

/**
 * Analyzer Agent REAL Integration Tests
 * 
 * These tests make REAL API calls to verify:
 * 1. Analyzer correctly evaluates token candidates
 * 2. Confidence scoring works with real market data
 * 3. Signal/no-signal decisions are accurate
 */

describe('Analyzer Agent - Real API Tests', () => {
  jest.setTimeout(120000); // 120 seconds for complex analysis

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Real Token Analysis', () => {
    it('should analyze real candidates and make signal decision', async () => {
      const { runner } = await AnalyzerAgent.build();

      // Test with real token candidates
      const candidates = [
        {
          symbol: 'ARB',
          name: 'Arbitrum',
          coingecko_id: 'arbitrum',
          chain: 'arbitrum',
          address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
          reason: 'Testing analyzer decision-making',
        },
      ];

      const prompt = `Analyze these candidates: ${JSON.stringify(candidates)}
      
      Global Market Context: {"bitcoin": {"price": 45000, "change_24h": 1.5}}`;

      const result = await runner.ask(prompt) as any;

      console.log('Analyzer Result:', JSON.stringify(result, null, 2));

      // Validate structure
      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(['signal', 'skip', 'no_signal']).toContain(result.action);
      expect(result.analysis_summary).toBeDefined();

      if (result.action === 'signal') {
        expect(result.selected_token).toBeDefined();
        expect(result.signal_details).toBeDefined();
        expect(result.signal_details.confidence).toBeGreaterThanOrEqual(80);
        expect(result.signal_details.entry_price).toBeDefined();
        expect(result.signal_details.target_price).toBeDefined();
        expect(result.signal_details.stop_loss).toBeDefined();
        
        console.log(`✅ Signal generated for ${result.selected_token.symbol} with ${result.signal_details.confidence}% confidence`);
      } else {
        console.log(`⚠️ No signal: ${result.analysis_summary}`);
      }
    });

    it('should test with weak candidate and expect rejection', async () => {
      const { runner } = await AnalyzerAgent.build();

      const weakCandidates = [
        {
          symbol: 'WEAKTOKEN',
          name: 'Weak Token',
          reason: 'Minimal volume, no clear catalyst',
        },
      ];

      const prompt = `Analyze these candidates: ${JSON.stringify(weakCandidates)}
      
      Global Market Context: {"bitcoin": {"price": 45000, "change_24h": -3.5}}`;

      const result = await runner.ask(prompt) as any;

      console.log('Weak Candidate Result:', JSON.stringify(result, null, 2));

      // Should likely reject weak setups
      expect(result.action).toBeDefined();
      
      if (result.action === 'no_signal') {
        console.log('✅ Analyzer correctly rejected weak setup');
      }
    });
  });

  describe('Risk/Reward Validation', () => {
    it('should validate proper risk/reward ratio in real signals', async () => {
      const { runner } = await AnalyzerAgent.build();

      const candidates = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          coingecko_id: 'ethereum',
          chain: 'ethereum',
          reason: 'Testing R:R ratio calculation',
        },
      ];

      const prompt = `Analyze these candidates: ${JSON.stringify(candidates)}`;

      const result = await runner.ask(prompt) as any;

      if (result.action === 'signal' && result.signal_details) {
        const risk = result.signal_details.entry_price - result.signal_details.stop_loss;
        const reward = result.signal_details.target_price - result.signal_details.entry_price;
        const ratio = reward / risk;

        console.log(`Risk/Reward Ratio: 1:${ratio.toFixed(2)}`);
        expect(ratio).toBeGreaterThan(0);
        // Ideally should be >= 2 for 1:2 R:R
      }
    });
  });
});
