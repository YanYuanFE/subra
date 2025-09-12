/**
 * Subra Services - Contract interaction services for the Subra subscription platform
 */

export { BaseContractService } from "./base";
export { SubscriptionFactoryService } from "./subscriptionFactory";
export { SubscriptionService } from "./subscription";
export { SubraService } from "./subra";
export * from "./types";
export * from "./config";
export * from "./abis";

// Re-export commonly used types for convenience
export type {
  NetworkStatus,
  TransactionResult,
  SubscriptionPlan,
  SubscriptionData,
  AutoRenewalAuth,
  FactoryInfo,
  Subscription,
  SubscribedEvent,
  RenewedEvent,
  AutoRenewalEnabledEvent,
  AutoRenewalExecutedEvent,
  PlanCreatedEvent,
} from "./types";

// Utility functions
export const isValidStarknetAddress = (address: string): boolean => {
  // Basic Starknet address validation
  return /^0x[0-9a-fA-F]{1,64}$/.test(address) && address.length <= 66;
};

export const formatStarknetAddress = (address: string): string => {
  // Ensure address starts with 0x and is properly formatted
  if (!address.startsWith("0x")) {
    return `0x${address}`;
  }
  return address.toLowerCase();
};

// Constants
export const SUBRA_CONSTANTS = {
  MAX_RENEWALS_LIMIT: 100,
  MIN_PERIOD_LENGTH: 86400, // 1 day in seconds
  MAX_PERIOD_LENGTH: 31536000, // 1 year in seconds
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;
