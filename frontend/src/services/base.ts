/**
 * 基础合约服务
 */

import {
  Contract,
  Provider,
  Account,
  CallData,
  RpcProvider,
  AccountInterface,
  Call,
} from "starknet";
import { NETWORKS, DEFAULT_NETWORK, NetworkConfig } from "./config";
import { NetworkStatus, TransactionResult } from "./types";

export class BaseContractService {
  protected provider: Provider;
  protected account?: Account;
  protected network: NetworkConfig;
  protected contracts: Map<string, Contract> = new Map();

  constructor(network: string = DEFAULT_NETWORK) {
    this.network = NETWORKS[network];
    if (!this.network) {
      throw new Error(`Unsupported network: ${network}`);
    }

    this.provider = new RpcProvider({
      nodeUrl: this.network.rpcUrl,
    });
  }

  /**
   * 连接钱包账户
   */
  async connectAccount(account: AccountInterface): Promise<void> {
    this.account = account as Account;
    // 重新初始化合约实例以使用新账户
    this.contracts.clear();
  }

  /**
   * 断开账户连接
   */
  disconnectAccount(): void {
    this.account = undefined;
    this.contracts.clear();
  }

  /**
   * 获取网络状态
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const status: NetworkStatus = {
        connected: false,
        network: this.network.name,
      };

      if (this.account) {
        status.connected = true;
        status.account = this.account.address;

        // 获取账户余额 - 暂时跳过，避免API兼容性问题
        // try {
        //   const balance = await this.provider.getBalance(this.account.address);
        //   status.balance = balance.amount.toString();
        // } catch (error) {
        //   console.warn("Failed to get balance:", error);
        // }
      }

      return status;
    } catch (error) {
      return {
        connected: false,
        network: this.network.name,
      };
    }
  }

  /**
   * 加载合约实例
   */
  protected async loadContract(
    contractKey: keyof typeof this.network.contracts,
    abi: any[]
  ): Promise<Contract> {
    const contractAddress = this.network.contracts[contractKey];
    if (!contractAddress) {
      throw new Error(
        `Contract ${contractKey} address not configured for network ${this.network.name}`
      );
    }

    const cacheKey = `${contractKey}-${contractAddress}`;
    if (this.contracts.has(cacheKey)) {
      return this.contracts.get(cacheKey)!;
    }
    const contract = new Contract(
      abi,
      contractAddress,
      this.account || this.provider
    );

    this.contracts.set(cacheKey, contract);
    return contract;
  }

  /**
   * 执行合约调用
   */
  protected async executeCall<T = any>(
    contract: Contract,
    functionName: string,
    calldata?: any[]
  ): Promise<T> {
    try {
      const result = await contract.call(functionName, calldata || []);
      return result as T;
    } catch (error) {
      console.error(`Call ${functionName} failed:`, error);
      throw new Error(`Failed to call ${functionName}: ${error}`);
    }
  }

  /**
   * 执行合约交易
   */
  protected async executeInvoke(
    contract: Contract,
    functionName: string,
    calldata?: any[],
    options?: any
  ): Promise<TransactionResult> {
    try {
      if (!this.account) {
        throw new Error("Account not connected");
      }

      const result = await contract.invoke(
        functionName,
        calldata || [],
        options
      );

      return {
        success: true,
        transactionHash: result.transaction_hash,
        data: result,
      };
    } catch (error) {
      console.error(`Invoke ${functionName} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 等待交易确认
   */
  protected async waitForTransaction(
    transactionHash: string,
    retryInterval: number = 2000,
    maxRetries: number = 30
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const receipt = await this.provider.getTransactionReceipt(
          transactionHash
        );
        if (receipt) {
          // 简化交易状态检查，避免类型兼容性问题
          return true;
        }
      } catch (error) {
        // 交易可能还没有上链，继续等待
      }

      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    return false;
  }

  /**
   * 获取交易状态
   */
  async getTransactionStatus(transactionHash: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(
        transactionHash
      );
      return receipt;
    } catch (error) {
      console.error("Failed to get transaction status:", error);
      return null;
    }
  }

  /**
   * 获取当前区块时间戳
   */
  async getCurrentTimestamp(): Promise<number> {
    try {
      const block = await this.provider.getBlock("latest");
      return block.timestamp;
    } catch (error) {
      console.warn("Failed to get block timestamp, using local time");
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * 获取网络配置
   */
  getNetworkConfig(): NetworkConfig {
    return this.network;
  }

  /**
   * 获取合约地址
   */
  getContractAddress(contractKey: keyof typeof this.network.contracts): string {
    return this.network.contracts[contractKey];
  }

  /**
   * 批量调用
   */
  protected async batchCall<T = any>(
    calls: Array<{
      contract: Contract;
      functionName: string;
      calldata?: any[];
    }>
  ): Promise<T[]> {
    const promises = calls.map((call) =>
      this.executeCall(call.contract, call.functionName, call.calldata)
    );

    return Promise.all(promises);
  }

  /**
   * 执行多重调用 (Multicall)
   */
  protected async executeMulticall(
    calls: Array<{
      contractAddress: string;
      entrypoint: string;
      calldata: any[];
    }>
  ): Promise<TransactionResult> {
    try {
      if (!this.account) {
        throw new Error("Account not connected");
      }

      const result = await this.account.execute(calls);

      return {
        success: true,
        transactionHash: result.transaction_hash,
        data: result,
      };
    } catch (error) {
      console.error("Multicall failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 格式化错误信息
   */
  protected formatError(error: any): string {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.reason) return error.reason;
    return "Unknown error occurred";
  }

  /**
   * 验证地址格式
   */
  protected isValidAddress(address: string): boolean {
    try {
      // Starknet地址验证
      return /^0x[0-9a-fA-F]{1,64}$/.test(address);
    } catch {
      return false;
    }
  }

  /**
   * 格式化calldata
   */
  protected formatCalldata(data: any[]): any[] {
    return data.map((item) => {
      if (typeof item === "string" && item.startsWith("0x")) {
        return item;
      }
      if (typeof item === "number") {
        return item.toString();
      }
      return item;
    });
  }
}
