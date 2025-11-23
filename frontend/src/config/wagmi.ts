import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { fraxtal } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64';

export const config = getDefaultConfig({
  appName: 'RogueAgent',
  projectId,
  chains: [fraxtal],
  ssr: false,
});

