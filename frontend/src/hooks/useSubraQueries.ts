import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubra } from "@/providers/SubraProvider";
import { useNetwork } from "@starknet-react/core";
import { SubscriptionPlan, SubscriptionData } from "@/services/types";
import { createERC20Service, getNetworkName, TokenMetadata } from "@/services/erc20";
import { NETWORKS } from "@/services/config";

// Token price types
interface TokenPrice {
  [key: string]: {
    usd: number;
  };
}

// Token symbol to CoinGecko ID mapping
const TOKEN_ID_MAP: { [symbol: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'STRK': 'starknet',
  // Add more mappings as needed
};

// Fetch token prices from CoinGecko
const fetchTokenPrices = async (symbols: string[]): Promise<TokenPrice> => {
  const ids = symbols.map(symbol => TOKEN_ID_MAP[symbol.toUpperCase()]).filter(Boolean);
  if (ids.length === 0) return {};
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch token prices');
  }
  
  return response.json();
};

// Query Keys
export const QUERY_KEYS = {
  TOTAL_PLANS: "totalPlans",
  USER_PLANS: "userPlans",
  PLAN_DETAILS: "planDetails",
  USER_SUBSCRIPTIONS: "userSubscriptions",
  USER_SUBSCRIPTION_COUNT: "userSubscriptionCount",
  SUBSCRIPTION_STATUS: "subscriptionStatus",
  NETWORK_STATUS: "networkStatus",
  TOKEN_METADATA: "tokenMetadata",
  TOKEN_SYMBOL: "tokenSymbol",
  TOKEN_PRICES: "tokenPrices",
  AUTO_RENEWAL_AUTH: "autoRenewalAuth",
} as const;

// 获取总计划数
export const useTotalPlans = () => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.TOTAL_PLANS],
    queryFn: () => subraService.getTotalPlans(),
  });
};

// 获取用户计划ID列表
export const useUserPlanIds = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PLANS, userAddress],
    queryFn: () => subraService.getUserPlans(userAddress!),
    enabled: !!userAddress,
  });
};

// 获取用户计划详情列表
export const useUserPlans = (userAddress?: string) => {
  const { subraService } = useSubra();
  const { data: planIds, isLoading: planIdsLoading } =
    useUserPlanIds(userAddress);

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PLANS, "details", userAddress],
    queryFn: async () => {
      if (!planIds || planIds.length === 0) return [];

      const planPromises = planIds.map((planId) =>
        subraService.getPlan(planId)
      );
      const plans = await Promise.all(planPromises);

      return plans
        .map((plan, index) => ({ planId: planIds[index], plan }))
        .filter((item) => item.plan !== null) as Array<{
        planId: string;
        plan: SubscriptionPlan;
      }>;
    },
    enabled:
      !!userAddress && !!planIds && planIds.length > 0 && !planIdsLoading,
  });
};

// 获取用户计划的收入统计
export const useUserPlansRevenue = (userAddress?: string) => {
  const { subraService } = useSubra();
  const { data: userPlansData, isLoading: userPlansLoading } =
    useUserPlans(userAddress);
  
  // 获取所有计划的token symbols
  const tokenSymbols = userPlansData?.map(item => item.plan.tokenSymbol).filter(Boolean) || [];
  const uniqueSymbols = [...new Set(tokenSymbols)];
  
  // 获取token价格
  const { data: tokenPrices, isLoading: pricesLoading } = useTokenPrices(uniqueSymbols);

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PLANS, "revenue", userAddress, tokenPrices],
    queryFn: async () => {
      if (!userPlansData || userPlansData.length === 0) {
        return { totalRevenue: 0, averageRevenue: 0, totalSubscribers: 0 };
      }

      let totalRevenue = 0;
      let totalSubscribers = 0;

      // 计算每个计划的收入
      for (const item of userPlansData) {
        const subscribers = item.plan.totalSubscribers || 0;
        const tokenAmount = parseFloat(item.plan.totalRevenue) || 0;
        const tokenSymbol = item.plan.tokenSymbol;
        
        totalSubscribers += subscribers;
        
        // 如果有价格数据，计算USD价值
        if (tokenSymbol && tokenPrices) {
          const tokenId = TOKEN_ID_MAP[tokenSymbol.toUpperCase()];
          const tokenPrice = tokenId ? tokenPrices[tokenId]?.usd : undefined;
          
          if (tokenPrice) {
            totalRevenue += tokenAmount * tokenPrice;
          } else {
            // 如果没有价格数据，使用原始token数量
            totalRevenue += tokenAmount;
          }
        } else {
          // 如果没有symbol或价格数据，使用原始token数量
          totalRevenue += tokenAmount;
        }
      }

      const averageRevenue =
        userPlansData.length > 0 ? totalRevenue / userPlansData.length : 0;

      return {
        totalRevenue,
        averageRevenue,
        totalSubscribers,
      };
    },
    enabled: !!userAddress && !!userPlansData && !userPlansLoading && !pricesLoading,
  });
};

// 获取计划详情
export const usePlanDetails = (planId?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.PLAN_DETAILS, planId],
    queryFn: () => subraService.getPlan(planId!),
    enabled: !!planId,
  });
};

// 获取用户订阅数据
export const useUserSubscriptions = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, userAddress],
    queryFn: () => subraService.getUserSubscriptions(userAddress!),
    enabled: !!userAddress,
  });
};

// 获取用户订阅的计划ID列表
export const useUserSubscriptionIds = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, userAddress],
    queryFn: () => subraService.getUserSubscriptionIds(userAddress!),
    enabled: !!userAddress,
  });
};

// 获取用户订阅数量
export const useUserSubscriptionCount = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTION_COUNT, userAddress],
    queryFn: () => subraService.getUserSubscriptionCount(userAddress!),
    enabled: !!userAddress,
  });
};

// 获取订阅状态
export const useSubscriptionStatus = (
  planId?: string,
  userAddress?: string
) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.SUBSCRIPTION_STATUS, planId, userAddress],
    queryFn: () => subraService.isSubscriptionActive(planId!, userAddress!),
    enabled: !!planId && !!userAddress,
  });
};

// 获取网络状态
export const useNetworkStatus = () => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.NETWORK_STATUS],
    queryFn: () => subraService.getNetworkStatus(),
    refetchInterval: 30 * 1000, // 每30秒自动刷新
  });
};

// Mutations

// 创建订阅计划
export const useCreatePlan = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      recipient: string;
      token: string;
      price: string;
      period: number;
    }) => {
      const result = await subraService.createPlan(
        params.name,
        params.recipient,
        params.token,
        params.price,
        params.period
      );
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Plan creation failed"
        );
      }
      return result;
    },
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOTAL_PLANS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_PLANS] });
    },
  });
};

// 订阅计划
export const useSubscribe = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();
  console.log(subraService, "sub");

  return useMutation({
    mutationFn: async (params: { planId: string; userAddress: string }) => {
      const result = await subraService.subscribe(
        params.planId,
        params.userAddress
      );
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Subscription failed"
        );
      }
      return result;
    },
    onSuccess: (_, variables) => {
      // 刷新相关查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, variables.userAddress],
      });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.SUBSCRIPTION_STATUS,
          variables.planId,
          variables.userAddress,
        ],
      });
    },
  });
};

// 续费订阅
export const useRenewSubscription = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { planId: string; userAddress: string }) => {
      const result = await subraService.renewSubscription(
        params.planId,
        params.userAddress
      );
      if (!result.success) {
        throw new Error(result.message || result.error || "Renewal failed");
      }
      return result;
    },
    onSuccess: (_, variables) => {
      // 刷新相关查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, variables.userAddress],
      });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.SUBSCRIPTION_STATUS,
          variables.planId,
          variables.userAddress,
        ],
      });
    },
  });
};

// 取消订阅
export const useCancelSubscription = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { planId: string; userAddress: string }) => {
      const result = await subraService.cancelSubscription(
        params.planId,
        params.userAddress
      );
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Cancellation failed"
        );
      }
      return result;
    },
    onSuccess: (_, variables) => {
      // 刷新相关查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, variables.userAddress],
      });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.SUBSCRIPTION_STATUS,
          variables.planId,
          variables.userAddress,
        ],
      });
    },
  });
};

// 重新激活计划
export const useReactivatePlan = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await subraService.reactivatePlan(planId);
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Plan reactivation failed"
        );
      }
      return result;
    },
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_PLANS] });
    },
  });
};

// 停用计划
export const useDeactivatePlan = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await subraService.deactivatePlan(planId);
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Plan deactivation failed"
        );
      }
      return result;
    },
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_PLANS] });
    },
  });
};

// ==================== Token Metadata Hooks ====================

/**
 * Get token metadata (name, symbol, decimals)
 */
export const useTokenMetadata = (tokenAddress?: string) => {
  const { chain } = useNetwork();
  
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_METADATA, tokenAddress, chain?.network],
    queryFn: () => {
      const networkConfig = NETWORKS[chain?.network || "sepolia"];
      const erc20Service = createERC20Service(getNetworkName(networkConfig));
      return erc20Service.getTokenMetadata(tokenAddress!);
    },
    enabled: !!tokenAddress && !!chain,
  });
};

/**
 * Get token symbol only (optimized for UI display)
 */
export const useTokenSymbol = (tokenAddress?: string) => {
  const { chain } = useNetwork();
  
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_SYMBOL, tokenAddress, chain?.network],
    queryFn: () => {
      const networkConfig = NETWORKS[chain?.network || "sepolia"];
      const erc20Service = createERC20Service(getNetworkName(networkConfig));
      return erc20Service.getTokenSymbol(tokenAddress!);
    },
    enabled: !!tokenAddress && !!chain,
  });
};

/**
 * Get multiple token symbols at once
 */
export const useTokenSymbols = (tokenAddresses: string[]) => {
  const { chain } = useNetwork();
  
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_SYMBOL, "batch", tokenAddresses, chain?.network],
    queryFn: async () => {
      const networkConfig = NETWORKS[chain?.network || "sepolia"];
      const erc20Service = createERC20Service(getNetworkName(networkConfig));
      
      const symbols = await Promise.all(
        tokenAddresses.map((address) => erc20Service.getTokenSymbol(address))
      );

      // Return a map of address -> symbol
      const symbolMap: Record<string, string | null> = {};
      tokenAddresses.forEach((address, index) => {
        symbolMap[address] = symbols[index];
      });

      return symbolMap;
    },
    enabled: tokenAddresses.length > 0 && !!chain,
  });
};

/**
 * Get token prices from CoinGecko
 */
export const useTokenPrices = (symbols: string[]) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_PRICES, symbols],
    queryFn: () => fetchTokenPrices(symbols),
    enabled: symbols.length > 0,
    staleTime: 2 * 60 * 1000, // 2分钟缓存
    refetchInterval: 5 * 60 * 1000, // 5分钟自动刷新
  });
};

// ==================== Auto Renewal Hooks ====================

/**
 * Get auto renewal authorization for a user's subscription
 */
export const useAutoRenewalAuth = (planId?: string, userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.AUTO_RENEWAL_AUTH, planId, userAddress],
    queryFn: () => subraService.getAutoRenewalAuth(planId!, userAddress!),
    enabled: !!planId && !!userAddress,
  });
};

/**
 * Enable auto renewal for a subscription
 */
export const useEnableAutoRenewal = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      maxRenewals,
      maxPrice,
    }: {
      planId: string;
      maxRenewals: number;
      maxPrice: string;
    }) => {
      const result = await subraService.enableAutoRenewal(
        planId,
        maxRenewals,
        maxPrice
      );
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Enable auto renewal failed"
        );
      }
      return result;
    },
    onSuccess: (_, variables) => {
      // 刷新自动续费授权查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.AUTO_RENEWAL_AUTH, variables.planId],
      });
      // 刷新用户订阅查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS],
      });
    },
  });
};

/**
 * Disable auto renewal for a subscription
 */
export const useDisableAutoRenewal = () => {
  const { subraService } = useSubra();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await subraService.disableAutoRenewal(planId);
      if (!result.success) {
        throw new Error(
          result.message || result.error || "Disable auto renewal failed"
        );
      }
      return result;
    },
    onSuccess: (_, planId) => {
      // 刷新自动续费授权查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.AUTO_RENEWAL_AUTH, planId],
      });
      // 刷新用户订阅查询
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS],
      });
    },
  });
};
