import { useLogs } from '../hooks/useLogs';
import { TerminalLog } from '../components/TerminalLog';
import { HugeiconsIcon } from '@hugeicons/react';
import { CommandLineIcon } from '@hugeicons/core-free-icons';

export function LogsPage() {
  const { data: logsData, isLoading } = useLogs(1, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={CommandLineIcon} className="w-6 h-6 text-cyan-500" />
            System Logs
          </h2>
          <p className="text-gray-400 mt-1">Raw execution logs from the agent swarm.</p>
        </div>
      </div>

      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-1">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : (
          <TerminalLog logs={logsData?.data || []} />
        )}
      </div>
    </div>
  );
}
