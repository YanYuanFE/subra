import { Account } from "starknet";
import { SubscriptionFactoryService } from "./subscriptionFactory";
import { SubscriptionService } from "./subscription";
import {
  NetworkStatus,
  TransactionResult,
  SubscriptionPlan,
  SubscriptionData,
  AutoRenewalAuth,
  FactoryInfo,
} from "./types";

/**
 * 统一的Subra服务类，整合factory和subscription功能
 * UI层只需要使用这个服务即可
 */
export class SubraService {
  private factoryService: SubscriptionFactoryService;
  private subscriptionServices: Map<string, SubscriptionService> = new Map();
  private network: string;

  constructor(network: string = "sepolia") {
    this.network = network;
    this.factoryService = new SubscriptionFactoryService(network);
  }

  /**
   * 连接钱包账户
   */
  async connectAccount(account: Account): Promise<void> {
    await this.factoryService.connectAccount(account);
    // 为所有已创建的subscription服务连接账户
    for (const service of this.subscriptionServices.values()) {
      await service.connectAccount(account);
    }
  }

  /**
   * 断开账户连接
   */
  disconnectAccount(): void {
    this.factoryService.disconnectAccount();
    for (const service of this.subscriptionServices.values()) {
      service.disconnectAccount();
    }
    this.subscriptionServices.clear();
  }

  /**
   * 获取网络状态
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    return await this.factoryService.getNetworkStatus();
  }

  // ==================== Factory 相关方法 ====================

  /**
   * 创建订阅计划
   */
  async createPlan(
    name: string,
    recipient: string,
    token: string,
    price: string,
    periodLength: number
  ): Promise<TransactionResult> {
    return await this.factoryService.createPlan(
      name,
      recipient,
      token,
      price,
      periodLength
    );
  }

  /**
   * 获取订阅计划信息
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    return await this.factoryService.getPlan(planId);
  }

  /**
   * 获取总计划数
   */
  async getTotalPlans(): Promise<number> {
    return await this.factoryService.getTotalPlans();
  }

  /**
   * 获取用户创建的计划列表（创作者用）
   */
  async getUserPlans(userAddress: string): Promise<string[]> {
    return await this.factoryService.getUserPlans(userAddress);
  }

  /**
   * 获取用户订阅的计划ID列表（订阅者用）
   */
  async getUserSubscriptionIds(userAddress: string): Promise<string[]> {
    return await this.factoryService.getUserSubscriptions(userAddress);
  }

  /**
   * 获取用户订阅数量
   */
  async getUserSubscriptionCount(userAddress: string): Promise<number> {
    return await this.factoryService.getUserSubscriptionCount(userAddress);
  }

  /**
   * 检查计划是否激活
   */
  async isPlanActive(planId: string): Promise<boolean> {
    return await this.factoryService.isPlanActive(planId);
  }

  /**
   * 获取订阅合约地址
   */
  async getSubscriptionContract(planId: string): Promise<string | null> {
    return await this.factoryService.getSubscriptionContract(planId);
  }

  /**
   * 停用计划
   */
  async deactivatePlan(planId: string): Promise<TransactionResult> {
    return await this.factoryService.deactivatePlan(planId);
  }

  /**
   * 重新激活计划
   */
  async reactivatePlan(planId: string): Promise<TransactionResult> {
    return await this.factoryService.reactivatePlan(planId);
  }

  /**
   * 获取所有激活的计划
   */
  async getActivePlans(): Promise<string[]> {
    return await this.factoryService.getActivePlans();
  }

  /**
   * 根据代币获取计划
   */
  async getPlansByToken(tokenAddress: string): Promise<string[]> {
    return await this.factoryService.getPlansByToken(tokenAddress);
  }

  // ==================== Subscription 相关方法 ====================

  /**
   * 获取或创建订阅服务实例
   */
  private async getSubscriptionService(
    planId: string
  ): Promise<SubscriptionService> {
    if (!this.subscriptionServices.has(planId)) {
      const contractAddress = await this.getSubscriptionContract(planId);
      console.log(contractAddress, "contractAddress");
      if (!contractAddress) {
        throw new Error(`No subscription contract found for plan ${planId}`);
      }

      const service = SubscriptionService.createWithAddress(
        contractAddress,
        this.network
      );

      // 如果已经连接了账户，为新服务也连接账户
      if (this.factoryService["account"]) {
        await service.connectAccount(this.factoryService["account"]);
      }

      this.subscriptionServices.set(planId, service);
    }

    return this.subscriptionServices.get(planId)!;
  }

  /**
   * 订阅计划
   */
  async subscribe(
    planId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const service = await this.getSubscriptionService(planId);
    return await service.subscribe(userAddress);
  }

  /**
   * 续费订阅
   */
  async renewSubscription(
    planId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const service = await this.getSubscriptionService(planId);
    return await service.renew(userAddress);
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(
    planId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const service = await this.getSubscriptionService(planId);
    return await service.cancel(userAddress);
  }

  /**
   * 启用自动续费
   */
  async enableAutoRenewal(
    planId: string,
    maxRenewals: number,
    maxPrice: string
  ): Promise<TransactionResult> {
    const service = await this.getSubscriptionService(planId);
    return await service.enableAutoRenewal(maxRenewals, maxPrice);
  }

  /**
   * 禁用自动续费
   */
  async disableAutoRenewal(planId: string): Promise<TransactionResult> {
    const service = await this.getSubscriptionService(planId);
    return await service.disableAutoRenewal();
  }

  /**
   * 自动续费
   */
  async autoRenew(
    planId: string,
    userAddress: string
  ): Promise<{ success: boolean; renewed: boolean; error?: string }> {
    const service = await this.getSubscriptionService(planId);
    return await service.autoRenew(userAddress);
  }

  /**
   * 检查订阅是否激活
   */
  async isSubscriptionActive(
    planId: string,
    userAddress: string
  ): Promise<boolean> {
    const service = await this.getSubscriptionService(planId);
    return await service.isActive(userAddress);
  }

  /**
   * 获取订阅信息
   */
  async getSubscription(
    planId: string,
    userAddress: string
  ): Promise<SubscriptionData | null> {
    const service = await this.getSubscriptionService(planId);
    return await service.getSubscription(userAddress);
  }

  /**
   * 获取计划信息（从订阅合约）
   */
  async getPlanInfo(planId: string): Promise<{
    recipient: string;
    token: string;
    price: string;
    periodLength: number;
  } | null> {
    const service = await this.getSubscriptionService(planId);
    return await service.getPlanInfo();
  }

  /**
   * 获取自动续费授权信息
   */
  async getAutoRenewalAuth(
    planId: string,
    userAddress: string
  ): Promise<AutoRenewalAuth | null> {
    const service = await this.getSubscriptionService(planId);
    return await service.getAutoRenewalAuth(userAddress);
  }

  /**
   * 获取续费次数
   */
  async getRenewalsCount(planId: string, userAddress: string): Promise<number> {
    const service = await this.getSubscriptionService(planId);
    return await service.getRenewalsCount(userAddress);
  }

  /**
   * 检查订阅合约是否暂停
   */
  async isSubscriptionPaused(planId: string): Promise<boolean> {
    const service = await this.getSubscriptionService(planId);
    return await service.isPaused();
  }

  // ==================== 便捷方法 ====================

  /**
   * 获取用户的所有订阅信息
   */
  async getUserSubscriptions(userAddress: string): Promise<
    Array<{
      planId: string;
      plan: SubscriptionPlan;
      subscription: SubscriptionData | null;
      isActive: boolean;
    }>
  > {
    const planIds = await this.getUserSubscriptionIds(userAddress);
    const results = [];

    for (const planId of planIds) {
      try {
        const plan = await this.getPlan(planId);
        if (!plan) continue;

        const subscription = await this.getSubscription(planId, userAddress);
        const isActive = subscription?.isActive || false;

        results.push({
          planId,
          plan,
          subscription,
          isActive,
        });
      } catch (error) {
        console.error(`Error fetching subscription for plan ${planId}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取所有激活计划的详细信息
   */
  async getActivePlansWithDetails(): Promise<
    Array<{
      planId: string;
      plan: SubscriptionPlan;
      contractAddress: string;
    }>
  > {
    const planIds = await this.getActivePlans();
    const results = [];

    for (const planId of planIds) {
      try {
        const plan = await this.getPlan(planId);
        const contractAddress = await this.getSubscriptionContract(planId);

        if (plan && contractAddress) {
          results.push({
            planId,
            plan,
            contractAddress,
          });
        }
      } catch (error) {
        console.error(`Error fetching plan details for ${planId}:`, error);
      }
    }

    return results;
  }
}
