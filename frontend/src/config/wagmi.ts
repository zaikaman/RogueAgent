import { http, createConfig } from 'wagmi';
import { fraxtal } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [fraxtal],
  connectors: [
    injected(),
  ],
  transports: {
    [fraxtal.id]: http(),
  },
});
