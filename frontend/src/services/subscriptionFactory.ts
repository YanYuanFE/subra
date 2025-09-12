import { Contract, CallData, num, Account } from "starknet";
import { BaseContractService } from "./base";
import {
  NetworkStatus,
  TransactionResult,
  SubscriptionPlan,
  FactoryInfo,
} from "./types";
import { subscriptionFactoryAbi } from "./abis";
import { createERC20Service, getNetworkName } from "./erc20";
import { formatUnits } from "viem";

/**
 * SubscriptionFactory contract service for managing subscription plans
 */
export class SubscriptionFactoryService extends BaseContractService {
  private factoryContract: Contract | null = null;
  private factoryAddress: string;

  constructor(network: string = "mainnet") {
    console.log("network", network);
    super(network);
    this.factoryAddress = this.getContractAddress("subscriptionFactory");
  }

  /**
   * Initialize the factory contract with connected account
   */
  async initializeContract(): Promise<void> {
    try {
      //   if (!this.account) {
      //     throw new Error('Account not connected. Please connect wallet first.');
      //   }

      this.factoryContract = new Contract(
        subscriptionFactoryAbi,
        this.factoryAddress,
        this.account || this.provider
      );
    } catch (error) {
      console.error(
        "Failed to initialize SubscriptionFactory contract:",
        error
      );
      throw error;
    }
  }

  /**
   * Override connectAccount to reinitialize contract
   */
  async connectAccount(account: Account): Promise<void> {
    await super.connectAccount(account);
    await this.initializeContract();
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(
    name: string,
    recipient: string,
    token: string,
    price: string,
    periodLength: number
  ): Promise<TransactionResult> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      // Get token decimals to convert price correctly
      const erc20Service = createERC20Service(getNetworkName(this.network));
      const decimals = await erc20Service.getTokenDecimals(token);
      console.log("decimals", decimals);
      if (decimals === null) {
        throw new Error(`Failed to get decimals for token: ${token}`);
      }

      // Convert price from human-readable format to token units
      // For example: if price is "1.5" and decimals is 18, result will be "1500000000000000000"
      const priceInTokenUnits = num
        .toBigInt(parseFloat(price) * Math.pow(10, decimals))
        .toString();

      const { transaction_hash } = await this.factoryContract.create_plan(
        name,
        recipient,
        token,
        priceInTokenUnits,
        periodLength
      );

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Plan creation transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Plan created successfully",
      };
    } catch (error) {
      console.error("Error creating plan:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to create plan",
      };
    }
  }

  /**
   * Get plan information by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_plan(num.toBigInt(planId));
      console.log(result, "plan");

      const tokenAddress = `0x${result.token.toString(16)}`;
      const rawPrice = result.price.toString();

      // Get token metadata for display
      const erc20Service = createERC20Service(getNetworkName(this.network));
      const tokenMetadata = await erc20Service.getTokenMetadata(tokenAddress);

      // Calculate display price (convert from token units to human-readable format)
      let displayPrice = rawPrice;
      if (tokenMetadata && tokenMetadata.decimals) {
        displayPrice = formatUnits(result.price, tokenMetadata.decimals);
      }

      return {
        id: result.id.toString(),
        recipient: `0x${result.recipient.toString(16)}`,
        token: tokenAddress,
        price: rawPrice,
        periodLength: Number(result.period_length),
        contractAddress: `0x${result.contract_address.toString(16)}`,
        isActive: result.is_active,
        createdAt: Number(result.created_at),
        totalSubscribers: Number(result.total_subscribers),
        totalRevenue: formatUnits(
          result.total_revenue,
          tokenMetadata?.decimals
        ),
        // Token metadata
        tokenName: tokenMetadata?.name,
        tokenSymbol: tokenMetadata?.symbol,
        tokenDecimals: tokenMetadata?.decimals,
        // Human-readable price
        displayPrice,
        name: result.name,
      };
    } catch (error) {
      console.error("Error getting subscription plan:", error);
      return null;
    }
  }

  /**
   * Get total number of plans
   */
  async getTotalPlans(): Promise<number> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_total_plans();
      return Number(result);
    } catch (error) {
      console.error("Error getting total plans:", error);
      return 0;
    }
  }

  /**
   * Get user's created plans (for creators)
   */
  async getUserPlans(userAddress: string): Promise<string[]> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_user_plans(userAddress);
      return result.map((planId: bigint) => planId.toString());
    } catch (error) {
      console.error("Error getting user plans:", error);
      return [];
    }
  }

  /**
   * Get user's subscriptions (for subscribers)
   */
  async getUserSubscriptions(userAddress: string): Promise<string[]> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_user_subscriptions(
        userAddress
      );
      return result.map((planId: bigint) => planId.toString());
    } catch (error) {
      console.error("Error getting user subscriptions:", error);
      return [];
    }
  }

  /**
   * Get user subscription count
   */
  async getUserSubscriptionCount(userAddress: string): Promise<number> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_user_subscription_count(
        userAddress
      );
      return Number(result);
    } catch (error) {
      console.error("Error getting user subscription count:", error);
      return 0;
    }
  }

  /**
   * Check if plan is active
   */
  async isPlanActive(planId: string): Promise<boolean> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.is_plan_active(
        num.toBigInt(planId)
      );
      return result;
    } catch (error) {
      console.error("Error checking plan status:", error);
      return false;
    }
  }

  /**
   * Get subscription contract address for a plan
   */
  async getSubscriptionContract(planId: string): Promise<string | null> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_subscription_contract(
        num.toBigInt(planId)
      );

      // Convert BigInt address to hex string format
      const contractAddress = num.toHex(result);
      return contractAddress;
    } catch (error) {
      console.error("Error getting subscription contract:", error);
      return null;
    }
  }

  /**
   * Deactivate a subscription plan
   */
  async deactivatePlan(planId: string): Promise<TransactionResult> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const { transaction_hash } = await this.factoryContract.deactivate_plan(
        num.toBigInt(planId)
      );

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Plan deactivation transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Plan deactivated successfully",
      };
    } catch (error) {
      console.error("Error deactivating plan:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to deactivate plan",
      };
    }
  }

  /**
   * Reactivate a subscription plan
   */
  async reactivatePlan(planId: string): Promise<TransactionResult> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const { transaction_hash } = await this.factoryContract.reactivate_plan(
        num.toBigInt(planId)
      );

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Plan reactivation transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Plan reactivated successfully",
      };
    } catch (error) {
      console.error("Error reactivating plan:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to reactivate plan",
      };
    }
  }

  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<string[]> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_active_plans();
      return result.map((planId: bigint) => planId.toString());
    } catch (error) {
      console.error("Error getting active plans:", error);
      return [];
    }
  }

  /**
   * Get plans by token address
   */
  async getPlansByToken(tokenAddress: string): Promise<string[]> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.get_plans_by_token(
        tokenAddress
      );
      return result.map((planId: bigint) => planId.toString());
    } catch (error) {
      console.error("Error getting plans by token:", error);
      return [];
    }
  }

  /**
   * Check if factory is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      if (!this.factoryContract) {
        await this.initializeContract();
      }

      const result = await this.factoryContract.is_paused();
      return result;
    } catch (error) {
      console.error("Error checking pause status:", error);
      return false;
    }
  }
}
