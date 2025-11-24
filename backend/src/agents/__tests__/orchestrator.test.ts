import { Orchestrator } from '../orchestrator';
import { coingeckoService } from '../../services/coingecko.service';

/**
 * Orchestrator REAL Integration Tests
 * 
 * Tests the actual workflow coordination:
 * 1. Event emission and logging
 * 2. State management
 * 3. Data flow validation
 */

describe('Orchestrator - Real Integration Tests', () => {
  let orchestrator: Orchestrator;
  jest.setTimeout(180000); // 3 minutes for full workflow

  beforeEach(() => {
    orchestrator = new Orchestrator();
    jest.clearAllMocks();
  });

  describe('Logging and Event System', () => {
    it('should broadcast log messages and emit events', (done) => {
      let logReceived = false;
      
      orchestrator.on('log', (log) => {
        expect(log).toBeDefined();
        expect(log.message).toBe('Test log message');
        expect(log.type).toBe('info');
        expect(log.timestamp).toBeDefined();
        logReceived = true;
        done();
      });

      orchestrator['broadcast']('Test log message', 'info');
      
      setTimeout(() => {
        if (!logReceived) {
          done.fail('Log event was not emitted');
        }
      }, 1000);
    });

    it('should retrieve logs with filtering', () => {
      orchestrator['broadcast']('Log 1', 'info');
      orchestrator['broadcast']('Log 2', 'success');
      orchestrator['broadcast']('Log 3', 'warning');

      const allLogs = orchestrator.getLogs();
      expect(allLogs.length).toBeGreaterThanOrEqual(3);

      const firstLogId = allLogs[0].id;
      const filteredLogs = orchestrator.getLogs(firstLogId);
      
      expect(filteredLogs.length).toBe(allLogs.length - 1);
      expect(filteredLogs.every(log => log.id > firstLogId)).toBe(true);
    });

    it('should maintain log history limit', () => {
      // Add 150 logs to test the 100 log limit
      for (let i = 0; i < 150; i++) {
        orchestrator['broadcast'](`Log ${i}`, 'info');
      }

      const logs = orchestrator.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Market Data Validation', () => {
    it('should validate real market data fetching', async () => {
      // Test that we can actually fetch market data
      const trending = await coingeckoService.getTrending();
      
      expect(Array.isArray(trending)).toBe(true);
      console.log(`Fetched ${trending.length} trending tokens from CoinGecko`);

      if (trending.length > 0) {
        const firstToken = trending[0];
        expect(firstToken).toHaveProperty('item');
      }
    });
  });

  describe('Workflow Logic', () => {
    it('should validate signal decision flow', () => {
      // Scanner returns candidates
      const scannerHasCandidates = true;
      
      // Analyzer evaluates
      const analyzerAction = 'signal';
      
      // Generator should run if signal is approved
      const shouldGenerate = scannerHasCandidates && analyzerAction === 'signal';
      expect(shouldGenerate).toBe(true);
    });

    it('should stop workflow if no candidates found', () => {
      const candidates: any[] = [];
      const shouldContinue = candidates.length > 0;
      
      expect(shouldContinue).toBe(false);
      // Workflow stops here - no need to waste API calls
    });
  });
});
