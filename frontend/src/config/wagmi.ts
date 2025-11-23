import { http, createConfig } from 'wagmi';
import { fraxtal } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'; // Fallback to a public ID if needed, or just use the env var

export const config = createConfig({
  chains: [fraxtal],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'RogueAgent' }),
  ],
  transports: {
    [fraxtal.id]: http(),
  },
});
