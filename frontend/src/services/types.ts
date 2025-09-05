/**
 * 服务层类型定义
 */

export interface NetworkStatus {
  connected: boolean;
  network: string;
  account?: string;
  balance?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
  data?: unknown;
}

// 订阅相关类型
export interface SubscriptionPlan {
  id: string;
  recipient: string;
  token: string;
  price: string;
  periodLength: number;
  contractAddress: string;
  isActive: boolean;
  createdAt: number;
  totalSubscribers: number;
  // Token metadata
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  // Human-readable price
  displayPrice?: string;
  name?: string;
  totalRevenue: string;
}

export interface Subscription {
  user: string;
  planId: string;
  startTime: number;
  endTime: number;
  renewalCount: number;
  isActive: boolean;
}

export interface AutoRenewalAuth {
  enabled: boolean;
  isEnabled: boolean;
  maxRenewals: number;
  remainingRenewals: number;
  maxPrice: string;
  authorizedAt: number;
}

export interface SubscriptionData {
  startTime: number;
  endTime: number;
  isActive: boolean;
  renewalsCount: number;
}

// 工厂合约相关类型
export interface FactoryInfo {
  totalPlans: number;
  feeRate: number;
  feeRecipient: string;
  subscriptionClassHash: string;
}

// 事件类型
export interface PlanCreatedEvent {
  planId: string;
  creator: string;
  subscriptionContract: string;
}

export interface SubscribedEvent {
  user: string;
  planId: string;
  startTime: number;
  endTime: number;
}

export interface RenewedEvent {
  user: string;
  newEndTime: number;
  renewalCount: number;
}

export interface AutoRenewalEnabledEvent {
  user: string;
  maxRenewals: number;
  maxPrice: string;
}

export interface AutoRenewalExecutedEvent {
  user: string;
  newEndTime: number;
  remainingRenewals: number;
}

// 查询参数类型
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface UserPlansQuery extends PaginationParams {
  user: string;
  activeOnly?: boolean;
}

export interface TokenPlansQuery extends PaginationParams {
  token: string;
  activeOnly?: boolean;
}
