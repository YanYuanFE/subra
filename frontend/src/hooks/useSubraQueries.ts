import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubra } from "@/providers/SubraProvider";
import { SubscriptionPlan, SubscriptionData } from "@/services/types";
import { erc20Service, TokenMetadata } from "@/services/erc20";

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
} as const;

// 获取总计划数
export const useTotalPlans = () => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.TOTAL_PLANS],
    queryFn: () => subraService.getTotalPlans(),
    staleTime: 30 * 1000, // 30秒
  });
};

// 获取用户计划ID列表
export const useUserPlanIds = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PLANS, userAddress],
    queryFn: () => subraService.getUserPlans(userAddress!),
    enabled: !!userAddress,
    staleTime: 60 * 1000, // 1分钟
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
    staleTime: 60 * 1000, // 1分钟
  });
};

// 获取用户计划的收入统计
export const useUserPlansRevenue = (userAddress?: string) => {
  const { subraService } = useSubra();
  const { data: userPlansData, isLoading: userPlansLoading } =
    useUserPlans(userAddress);

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PLANS, "revenue", userAddress],
    queryFn: async () => {
      if (!userPlansData || userPlansData.length === 0) {
        return { totalRevenue: 0, averageRevenue: 0, totalSubscribers: 0 };
      }

      let totalRevenue = 0;
      let totalSubscribers = 0;

      // 计算每个计划的收入
      for (const item of userPlansData) {
        const subscribers = item.plan.totalSubscribers || 0;

        totalSubscribers += subscribers;
        totalRevenue += parseFloat(item.plan.totalRevenue) || 0;
      }

      const averageRevenue =
        userPlansData.length > 0 ? totalRevenue / userPlansData.length : 0;

      return {
        totalRevenue,
        averageRevenue,
        totalSubscribers,
      };
    },
    enabled: !!userAddress && !!userPlansData && !userPlansLoading,
    staleTime: 60 * 1000, // 1分钟
  });
};

// 获取计划详情
export const usePlanDetails = (planId?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.PLAN_DETAILS, planId],
    queryFn: () => subraService.getPlan(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取用户订阅数据
export const useUserSubscriptions = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, userAddress],
    queryFn: () => subraService.getUserSubscriptions(userAddress!),
    enabled: !!userAddress,
    staleTime: 30 * 1000, // 30秒
  });
};

// 获取用户订阅的计划ID列表
export const useUserSubscriptionIds = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTIONS, userAddress],
    queryFn: () => subraService.getUserSubscriptionIds(userAddress!),
    enabled: !!userAddress,
    staleTime: 60 * 1000, // 1分钟
  });
};

// 获取用户订阅数量
export const useUserSubscriptionCount = (userAddress?: string) => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SUBSCRIPTION_COUNT, userAddress],
    queryFn: () => subraService.getUserSubscriptionCount(userAddress!),
    enabled: !!userAddress,
    staleTime: 30 * 1000, // 30秒
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
    staleTime: 10 * 1000, // 10秒
  });
};

// 获取网络状态
export const useNetworkStatus = () => {
  const { subraService } = useSubra();

  return useQuery({
    queryKey: [QUERY_KEYS.NETWORK_STATUS],
    queryFn: () => subraService.getNetworkStatus(),
    staleTime: 60 * 1000, // 1分钟
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
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_METADATA, tokenAddress],
    queryFn: () => erc20Service.getTokenMetadata(tokenAddress!),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes - token metadata rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get token symbol only (optimized for UI display)
 */
export const useTokenSymbol = (tokenAddress?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_SYMBOL, tokenAddress],
    queryFn: () => erc20Service.getTokenSymbol(tokenAddress!),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get multiple token symbols at once
 */
export const useTokenSymbols = (tokenAddresses: string[]) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_SYMBOL, "batch", tokenAddresses],
    queryFn: async () => {
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
    enabled: tokenAddresses.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
