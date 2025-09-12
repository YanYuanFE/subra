/**
 * Subra 订阅平台合约配置
 */

export interface NetworkConfig {
  network: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    subscriptionFactory: string;
    subscriptionClassHash: string;
    strkToken: string;
  };
  feeRate: number;
  feeRecipient: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    network: "sepolia",
    name: "Starknet Sepolia Testnet",
    rpcUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
    explorerUrl: "https://sepolia.starkscan.co",
    contracts: {
      subscriptionFactory:
        "0x037f15889dabcef1a985887c380520637446a59019112e1b50ddb2c46b9facbb",
      subscriptionClassHash:
        "0x00966ae0ef6222adca73df0063d84cd1cb2843fada4ddf53a24fad7ddcde668c",
      strkToken:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    },
    feeRate: 100, // 1% (100 basis points)
    feeRecipient:
      "0x05c755ba1828c70314349c4c4ddaf310e648d5773f9bb6c4eb6ce2369288569",
  },
  mainnet: {
    network: "mainnet",
    name: "Starknet Mainnet",
    rpcUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_8",
    explorerUrl: "https://starkscan.co",
    contracts: {
      subscriptionFactory:
        "0x071cef4b22646bb4c0dca1079195fcfdc425fff7b572e7558cb94c5be7e27e91",
      subscriptionClassHash:
        "0x0689831680b275ba57e8bca5247269a4199f420ac0e80c249c4a54b3cac6f94f",
      strkToken:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    },
    feeRate: 100,
    feeRecipient:
      "0x05c755ba1828c70314349c4c4ddaf310e648d5773f9bb6c4eb6ce2369288569",
  },
};

// 默认网络
export const DEFAULT_NETWORK = "mainnet";

// 合约 ABI 路径
export const CONTRACT_ABIS = {
  subscription: "./src/services/abis/subscription.json",
  subscriptionFactory: "./src/services/abis/subscriptionFactory.json",
};

// 订阅平台常量配置
// 代币地址映射
export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  sepolia: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080",
  },
  mainnet: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  },
};

export const CONSTANTS = {
  STRK_DECIMALS: 18,
  MAX_RENEWALS_LIMIT: 100,
  MIN_PERIOD_LENGTH: 86400, // 1 day in seconds
  MAX_PERIOD_LENGTH: 31536000, // 1 year in seconds
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  FEE_RATE_DECIMALS: 4, // 10000 = 100%
};
