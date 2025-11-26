/**
 * Recalculate PnL for closed trades that have 0 PnL
 * Usage: npx ts-node scripts/recalculate-pnl.ts <walletAddress>
 */

import 'dotenv/config';
import { signalExecutorService } from '../src/services/signal-executor.service';
import { futuresAgentsService } from '../src/services/futures-agents.service';

async function main() {
  const walletAddress = process.argv[2];
  
  if (!walletAddress) {
    console.error('Usage: npx ts-node scripts/recalculate-pnl.ts <walletAddress>');
    process.exit(1);
  }

  console.log(`\n🔧 Recalculating PnL for trades of wallet: ${walletAddress}\n`);

  // First, show current trades
  const trades = await futuresAgentsService.getUserTrades(walletAddress, 50);
  console.log(`Found ${trades.length} trades total\n`);
  
  const closedTrades = trades.filter(t => t.status !== 'open');
  console.log('Closed trades:');
  for (const trade of closedTrades) {
    console.log(`  - ${trade.id.slice(0, 8)}... ${trade.symbol} ${trade.direction} | Entry: $${trade.entry_price} | Exit: $${trade.exit_price || 'N/A'} | PnL: ${trade.pnl_percent?.toFixed(2) || 0}% ($${trade.pnl_usd?.toFixed(2) || 0}) | Status: ${trade.status}`);
  }

  console.log('\n📊 Running PnL recalculation...\n');
  
  const result = await signalExecutorService.recalculateClosedTradePnL(walletAddress);
  
  console.log(`\n✅ Updated ${result.updated} trades`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️ Errors:`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  // Show updated trades
  if (result.updated > 0) {
    console.log('\n📈 Updated trades:');
    const updatedTrades = await futuresAgentsService.getUserTrades(walletAddress, 50);
    const closedUpdated = updatedTrades.filter(t => t.status !== 'open');
    for (const trade of closedUpdated) {
      console.log(`  - ${trade.id.slice(0, 8)}... ${trade.symbol} ${trade.direction} | Entry: $${trade.entry_price} | Exit: $${trade.exit_price || 'N/A'} | PnL: ${trade.pnl_percent?.toFixed(2) || 0}% ($${trade.pnl_usd?.toFixed(2) || 0}) | Status: ${trade.status}`);
    }
  }

  console.log('\n✨ Done!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
