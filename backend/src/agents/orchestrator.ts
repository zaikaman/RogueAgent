import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { PublisherAgent } from './publisher.agent';
import { logger } from '../utils/logger.util';
import { supabaseService } from '../services/supabase.service';
import { randomUUID } from 'crypto';

export class Orchestrator {
  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);

    try {
      // 1. Scanner
      logger.info('Running Scanner Agent...');
      const { runner: scanner } = await ScannerAgent.build();
      const scannerResult = await scanner.ask('Scan the market for top trending tokens.');
      
      logger.info('Scanner result:', scannerResult);

      if (!scannerResult.candidates || scannerResult.candidates.length === 0) {
        logger.info('No candidates found. Skipping run.');
        await this.saveRun(runId, 'skip', {}, startTime);
        return;
      }

      // 2. Analyzer
      logger.info('Running Analyzer Agent...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerResult = await analyzer.ask(
        `Analyze these candidates: ${JSON.stringify(scannerResult.candidates)}`
      );

      logger.info('Analyzer result:', analyzerResult);

      if (analyzerResult.action === 'skip' || !analyzerResult.selected_token || !analyzerResult.signal_details) {
        logger.info('Analyzer decided to skip.');
        await this.saveRun(runId, 'skip', {}, startTime);
        return;
      }

      // 3. Generator
      logger.info('Running Generator Agent...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorResult = await generator.ask(
        `Generate content for this signal: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`
      );

      logger.info('Generator result:', generatorResult);

      // 4. Publisher
      logger.info('Running Publisher Agent...');
      const { runner: publisher } = await PublisherAgent.build();
      const publisherResult = await publisher.ask(
        `Post this content to Twitter: ${generatorResult.formatted_content}`
      );
      
      logger.info('Publisher result:', publisherResult);

      // 5. Save Result
      const signalContent = {
        token: analyzerResult.selected_token,
        ...analyzerResult.signal_details,
        formatted_tweet: generatorResult.formatted_content,
      };

      const publicPostedAt = publisherResult.status === 'posted' ? new Date().toISOString() : null;

      await this.saveRun(
        runId, 
        'signal', 
        signalContent, 
        startTime, 
        analyzerResult.signal_details.confidence,
        undefined,
        publicPostedAt
      );
      
      logger.info('Run completed successfully.');

    } catch (error: any) {
      logger.error('Swarm run failed:', error);
      await this.saveRun(runId, 'skip', { error: error.message }, startTime, null, error.message);
    }
  }

  private async saveRun(
    id: string, 
    type: 'signal' | 'intel' | 'skip', 
    content: any, 
    startTime: number,
    confidence?: number | null,
    errorMessage?: string,
    publicPostedAt?: string | null
  ) {
    const endTime = Date.now();
    await supabaseService.createRun({
      id,
      type,
      content,
      cycle_started_at: new Date(startTime).toISOString(),
      cycle_completed_at: new Date(endTime).toISOString(),
      execution_time_ms: endTime - startTime,
      confidence_score: confidence,
      error_message: errorMessage,
      public_posted_at: publicPostedAt,
    });
  }
}

export const orchestrator = new Orchestrator();
