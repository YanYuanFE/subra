/**
 * ABI exports for Subra contracts
 */

import subscriptionFactory from "./subra_SubscriptionFactory.contract_class.json";
import subscription from "./subra_Subscription.contract_class.json";

export const subscriptionAbi = subscription.abi;
export const subscriptionFactoryAbi = subscriptionFactory.abi;

// Type definitions for ABI structures
export interface AbiFunction {
  type: "function";
  name: string;
  inputs: Array<{
    name: string;
    type: string;
  }>;
  outputs: Array<{
    type: string;
  }>;
  state_mutability: "view" | "external";
}

export interface AbiEvent {
  type: "event";
  name: string;
  inputs: Array<{
    name: string;
    type: string;
  }>;
}

export interface AbiStruct {
  type: "struct";
  name: string;
  members: Array<{
    name: string;
    type: string;
  }>;
}

export type AbiItem = AbiFunction | AbiEvent | AbiStruct;
export type ContractAbi = AbiItem[];
