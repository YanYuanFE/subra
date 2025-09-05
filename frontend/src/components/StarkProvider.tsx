'use client';
import React from 'react';

import { Chain, mainnet, sepolia } from '@starknet-react/chains';
import {
  StarknetConfig,
  argent,
  braavos,
  useInjectedConnectors,
  voyager,
  InjectedConnector,
  jsonRpcProvider
} from '@starknet-react/core';
import { NETWORKS } from '@/services';

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [
      argent(),
      braavos(),
      new InjectedConnector({
        options: { id: 'okxwallet' }
      })
    ],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: 'onlyIfNoConnectors',
    // Randomize the order of the connectors.
    order: 'random'
  });

  return (
    <StarknetConfig
      chains={[sepolia, mainnet]}
      connectors={connectors}
      explorer={voyager}
      autoConnect
      provider={jsonRpcProvider({
        rpc: (chain: Chain) => {
          switch (chain) {
            case mainnet:
              return { nodeUrl: NETWORKS.mainnet.rpcUrl };
            case sepolia:
            default:
              return { nodeUrl: NETWORKS.sepolia.rpcUrl };
          }
        }
      })}
    >
      {children}
    </StarknetConfig>
  );
}
