import { Contract, CallData, num, Account, cairo } from "starknet";
import { BaseContractService } from "./base";
import {
  NetworkStatus,
  TransactionResult,
  SubscriptionData,
  AutoRenewalAuth,
} from "./types";
import { subscriptionAbi } from "./abis";
import { createERC20Service, getNetworkName } from "./erc20";
import { formatUnits } from "viem";

/**
 * Subscription contract service for managing individual subscriptions
 */
export class SubscriptionService extends BaseContractService {
  private subscriptionContract: Contract | null = null;
  private contractAddress: string;

  constructor(contractAddress: string, network: string = "sepolia") {
    super(network);
    this.contractAddress = contractAddress;
  }

  /**
   * Create service instance with contract address from config
   * This method should be used when the subscription contract address is known
   */
  static createWithAddress(
    contractAddress: string,
    network: string = "sepolia"
  ): SubscriptionService {
    return new SubscriptionService(contractAddress, network);
  }

  /**
   * Initialize the subscription contract with connected account
   */
  async initializeContract(): Promise<void> {
    try {
      // if (!this.account) {
      //   throw new Error('Account not connected. Please connect wallet first.');
      // }

      this.subscriptionContract = new Contract(
        subscriptionAbi,
        this.contractAddress,
        this.account || this.provider
      );
    } catch (error) {
      console.error("Failed to initialize Subscription contract:", error);
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
   * Check if user has sufficient balance and allowance for subscription
   */
  async checkSubscriptionRequirements(userAddress: string): Promise<{
    hasBalance: boolean;
    balance: string;
    required: string;
    tokenAddress: string;
  }> {
    try {
      // Get plan info to know token and price
      const planInfo = await this.getPlanInfo();
      if (!planInfo) {
        throw new Error("Plan info not available");
      }

      const erc20Service = createERC20Service(getNetworkName(this.network));
      await erc20Service.connectAccount(this.account!);

      // Check balance only (allowance will be handled by multicall)
      const balance = await erc20Service.getTokenBalance(
        planInfo.token,
        userAddress
      );

      if (balance === null) {
        throw new Error("Failed to get token balance");
      }

      const required = planInfo.price;
      const hasBalance = BigInt(balance) >= BigInt(required);

      console.log(balance, "bb", required);

      return {
        hasBalance,
        balance,
        required,
        tokenAddress: planInfo.token,
      };
    } catch (error) {
      console.error("Error checking subscription requirements:", error);
      throw error;
    }
  }

  /**
   * Approve token spending for subscription
   */
  async approveToken(
    userAddress: string,
    amount?: string
  ): Promise<TransactionResult> {
    try {
      const planInfo = await this.getPlanInfo();
      if (!planInfo) {
        throw new Error("Plan info not available");
      }

      const erc20Service = createERC20Service(getNetworkName(this.network));
      await erc20Service.connectAccount(this.account!);

      const approveAmount = amount || planInfo.price;

      return await erc20Service.approveToken(
        planInfo.token,
        this.contractAddress,
        approveAmount
      );
    } catch (error) {
      console.error("Error approving token:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to approve token",
      };
    }
  }

  /**
   * Subscribe to the plan with pre-checks
   */
  async subscribe(userAddress: string): Promise<TransactionResult> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      if (!this.account) {
        return {
          success: false,
          error: "Account not connected",
          message: "Please connect your wallet first",
        };
      }

      // Get plan info to determine token and price
      const planInfo = await this.getPlanInfo();
      const tokenAddress = planInfo.token;
      const price = planInfo.price;

      // Check only balance requirement
      const requirements = await this.checkSubscriptionRequirements(
        userAddress
      );

      console.log(requirements, "rr");
      if (!requirements.hasBalance) {
        throw new Error(
          `Insufficient token balance. Required: ${requirements.required}, Available: ${requirements.balance}`
        );
      }

      // Use multicall to approve and subscribe in one transaction
      const calls = [
        {
          // Call 1: Approve tokens to subscription contract
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: CallData.compile([
            this.contractAddress, // spender
            cairo.uint256(planInfo.price), // amount as u256
          ]),
        },
        {
          // Call 2: Subscribe
          contractAddress: this.contractAddress,
          entrypoint: "subscribe",
          calldata: CallData.compile([
            userAddress, // user
          ]),
        },
      ];

      // Execute multicall transaction
      const result = await this.executeMulticall(calls);

      if (result.success) {
        // Wait for transaction confirmation
        const confirmed = await this.waitForTransaction(
          result.transactionHash!
        );
        if (!confirmed) {
          return {
            success: false,
            error: "Transaction confirmation timeout",
            message: "Subscription transaction failed to confirm",
          };
        }

        return {
          success: true,
          transactionHash: result.transactionHash!,
          message: "Subscription created successfully",
        };
      } else {
        throw new Error(result.error || "Multicall failed");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to subscribe",
      };
    }
  }

  /**
   * Renew subscription with pre-checks and token approval
   */
  async renew(userAddress: string): Promise<TransactionResult> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      if (!this.account) {
        return {
          success: false,
          error: "Account not connected",
          message: "Please connect your wallet first",
        };
      }

      // Get plan info to determine token and price
      const planInfo = await this.getPlanInfo();
      const tokenAddress = planInfo.token;
      const price = planInfo.price;

      // Check balance requirement
      const requirements = await this.checkSubscriptionRequirements(
        userAddress
      );

      if (!requirements.hasBalance) {
        throw new Error(
          `Insufficient token balance. Required: ${requirements.required}, Available: ${requirements.balance}`
        );
      }

      // Use multicall to approve and renew in one transaction
      const calls = [
        {
          // Call 1: Approve tokens to subscription contract
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: CallData.compile([
            this.contractAddress, // spender
            cairo.uint256(planInfo.price), // amount as u256
          ]),
        },
        {
          // Call 2: Renew subscription
          contractAddress: this.contractAddress,
          entrypoint: "renew",
          calldata: CallData.compile([
            userAddress, // user
          ]),
        },
      ];

      // Execute multicall transaction
      const result = await this.executeMulticall(calls);

      if (result.success) {
        // Wait for transaction confirmation
        const confirmed = await this.waitForTransaction(
          result.transactionHash!
        );
        if (!confirmed) {
          return {
            success: false,
            error: "Transaction confirmation timeout",
            message: "Renewal transaction failed to confirm",
          };
        }

        return {
          success: true,
          transactionHash: result.transactionHash!,
          message: "Subscription renewed successfully",
        };
      } else {
        throw new Error(result.error || "Multicall failed");
      }
    } catch (error) {
      console.error("Error renewing subscription:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to renew subscription",
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancel(userAddress: string): Promise<TransactionResult> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const { transaction_hash } = await this.subscriptionContract.cancel(
        userAddress
      );

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Cancel transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Subscription canceled successfully",
      };
    } catch (error) {
      console.error("Error canceling subscription:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to cancel subscription",
      };
    }
  }

  /**
   * Enable auto renewal
   */
  async enableAutoRenewal(
    maxRenewals: number,
    maxPrice: string
  ): Promise<TransactionResult> {
    try {
      if (!this.subscriptionContract || !this.account) {
        await this.initializeContract();
      }

      // Get plan info to obtain token address and decimals
      const planInfo = await this.getPlanInfo();
      if (!planInfo) {
        throw new Error("Plan info not available");
      }

      // Get token decimals for proper precision conversion
      const erc20Service = createERC20Service(getNetworkName(this.network));
      await erc20Service.connectAccount(this.account!);
      const tokenDecimals = await erc20Service.getTokenDecimals(planInfo.token);
      if (tokenDecimals === null) {
        throw new Error(`Failed to get decimals for token: ${planInfo.token}`);
      }

      // Convert maxPrice from human-readable format to token units
      // For example: if maxPrice is "1.5" and decimals is 18, result will be "1500000000000000000"
      const maxPriceInTokenUnits = num.toBigInt(
        parseFloat(maxPrice) * Math.pow(10, tokenDecimals)
      );

      // Calculate total approval amount (max_price * max_renewals)
      const totalApprovalAmount =
        maxPriceInTokenUnits * num.toBigInt(maxRenewals);

      // Prepare multicall: approve + enable_auto_renewal
      const calls = [
        {
          contractAddress: planInfo.token,
          entrypoint: "approve",
          calldata: CallData.compile([
            this.contractAddress, // spender
            cairo.uint256(totalApprovalAmount), // amount as u256
          ]),
        },
        {
          contractAddress: this.contractAddress,
          entrypoint: "enable_auto_renewal",
          calldata: CallData.compile([
            maxRenewals, // max_renewals as u32
            cairo.uint256(maxPriceInTokenUnits), // max_price as u256
          ]),
        },
      ];

      // Execute multicall
      const { transaction_hash } = await this.account!.execute(calls);

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Enable auto-renewal transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Auto renewal enabled successfully",
      };
    } catch (error) {
      console.error("Error enabling auto renewal:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to enable auto renewal",
      };
    }
  }

  /**
   * Disable auto renewal
   */
  async disableAutoRenewal(): Promise<TransactionResult> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const { transaction_hash } =
        await this.subscriptionContract.disable_auto_renewal();

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(transaction_hash);
      if (!confirmed) {
        return {
          success: false,
          error: "Transaction confirmation timeout",
          message: "Disable auto-renewal transaction failed to confirm",
        };
      }

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Auto renewal disabled successfully",
      };
    } catch (error) {
      console.error("Error disabling auto renewal:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to disable auto renewal",
      };
    }
  }

  /**
   * Execute auto renewal for a user
   */
  async autoRenew(
    userAddress: string
  ): Promise<{ success: boolean; renewed: boolean; error?: string }> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.auto_renew(userAddress);

      return {
        success: true,
        renewed: result,
      };
    } catch (error) {
      console.error("Error executing auto renewal:", error);
      return {
        success: false,
        renewed: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Check if user subscription is active
   */
  async isActive(userAddress: string): Promise<boolean> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.is_active(userAddress);

      return result;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  }

  /**
   * Get subscription data for a user
   */
  async getSubscription(userAddress: string): Promise<SubscriptionData | null> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.get_subscription(
        userAddress
      );
      console.log(result, "result");

      return {
        startTime: Number(result.start_time),
        endTime: Number(result.end_time),
        isActive: result.is_active,
        renewalsCount: Number(result.renewals_count),
      };
    } catch (error) {
      console.error("Error getting subscription data:", error);
      return null;
    }
  }

  /**
   * Get plan information
   */
  async getPlanInfo(): Promise<{
    recipient: string;
    token: string;
    price: string;
    periodLength: number;
  } | null> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.get_plan_info();

      return {
        recipient: num.toHex(result[0]),
        token: num.toHex(result[1]),
        price: result[2].toString(),
        periodLength: Number(result[3]),
      };
    } catch (error) {
      console.error("Error getting plan info:", error);
      return null;
    }
  }

  /**
   * Get plan ID
   */
  async getPlanId(): Promise<string | null> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.get_plan_id();
      return result.toString();
    } catch (error) {
      console.error("Error getting plan ID:", error);
      return null;
    }
  }

  /**
   * Get auto renewal authorization for a user
   */
  async getAutoRenewalAuth(
    userAddress: string
  ): Promise<AutoRenewalAuth | null> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.get_auto_renewal_auth(
        userAddress
      );
      console.log(result, "result");

      // Get plan info to obtain token address and decimals for price formatting
      const planInfo = await this.getPlanInfo();
      let formattedMaxPrice = result.max_price.toString();

      if (planInfo) {
        // Get token decimals for proper price formatting
        const erc20Service = createERC20Service(getNetworkName(this.network));
        await erc20Service.connectAccount(this.account!);
        const tokenDecimals = await erc20Service.getTokenDecimals(
          planInfo.token
        );

        if (tokenDecimals !== null) {
          // Format maxPrice from token units to human-readable format
          formattedMaxPrice = formatUnits(result.max_price, tokenDecimals);
        }
      }

      return {
        enabled: result.is_enabled,
        isEnabled: result.is_enabled,
        maxRenewals: Number(result.max_renewals),
        remainingRenewals: Number(result.remaining_renewals),
        maxPrice: formattedMaxPrice,
        authorizedAt: Number(result.authorized_at),
      };
    } catch (error) {
      console.error("Error getting auto renewal auth:", error);
      return null;
    }
  }

  /**
   * Get renewals count for a user
   */
  async getRenewalsCount(userAddress: string): Promise<number> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.get_renewals_count(
        userAddress
      );
      return Number(result);
    } catch (error) {
      console.error("Error getting renewals count:", error);
      return 0;
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      if (!this.subscriptionContract) {
        await this.initializeContract();
      }

      const result = await this.subscriptionContract.is_paused();
      return result;
    } catch (error) {
      console.error("Error checking pause status:", error);
      return false;
    }
  }

  /**
   * Reinitialize contract with new account
   */
  async reinitialize(): Promise<void> {
    await this.initializeContract();
  }
}
