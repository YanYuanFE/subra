/**
 * ABI 导出文件
 * 从前端复制的合约 ABI 定义
 */

import subscriptionFactoryAbi from './subra_SubscriptionFactory.contract_class.json' with { type: 'json' };
import subscriptionAbi from './subra_Subscription.contract_class.json' with { type: 'json' };
import erc20Abi from './erc20.json' with { type: 'json' };

// 导出 ABI
export { subscriptionFactoryAbi, subscriptionAbi, erc20Abi };

// 类型定义
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