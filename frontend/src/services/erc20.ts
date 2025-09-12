import { Contract, CallData, num, shortString } from "starknet";
import { BaseContractService } from "./base";
import { TransactionResult } from "./types";
import erc20Abi from "./abis/erc20.json";

/**
 * ERC20 token metadata interface
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

/**
 * ERC20 service for querying token metadata
 */
export class ERC20Service extends BaseContractService {
  private tokenContracts: Map<string, Contract> = new Map();

  /**
   * Get or create token contract instance
   */
  private getTokenContract(tokenAddress: string): Contract {
    if (!this.tokenContracts.has(tokenAddress)) {
      const contract = new Contract(erc20Abi, tokenAddress, this.provider);
      this.tokenContracts.set(tokenAddress, contract);
    }

    return this.tokenContracts.get(tokenAddress)!;
  }

  /**
   * Get token metadata (name, symbol, decimals)
   */
  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error("Invalid token address");
      }

      const contract = this.getTokenContract(tokenAddress);

      // Call all metadata functions in parallel
      const [nameResult, symbolResult, decimalsResult] = await Promise.all([
        contract.call("name"),
        contract.call("symbol"),
        contract.call("decimals"),
      ]);

      return {
        name: shortString.decodeShortString(nameResult.toString()),
        symbol: shortString.decodeShortString(symbolResult.toString()),
        decimals: Number(decimalsResult),
      };
    } catch (error) {
      console.error("Failed to get token metadata:", error);
      return null;
    }
  }

  /**
   * Get token symbol only (optimized for UI display)
   */
  async getTokenSymbol(tokenAddress: string): Promise<string | null> {
    try {
      if (!this.isValidAddress(tokenAddress)) {
        return null;
      }

      const contract = this.getTokenContract(tokenAddress);
      const symbolResult = await contract.call("symbol");

      return shortString.decodeShortString(symbolResult.toString());
    } catch (error) {
      console.error("Failed to get token symbol:", error);
      return null;
    }
  }

  /**
   * Get token name only
   */
  async getTokenName(tokenAddress: string): Promise<string | null> {
    try {
      if (!this.isValidAddress(tokenAddress)) {
        return null;
      }

      const contract = this.getTokenContract(tokenAddress);
      const nameResult = await contract.call("name");

      return shortString.decodeShortString(nameResult.toString());
    } catch (error) {
      console.error("Failed to get token name:", error);
      return null;
    }
  }

  /**
   * Get token decimals only
   */
  async getTokenDecimals(tokenAddress: string): Promise<number | null> {
    try {
      if (!this.isValidAddress(tokenAddress)) {
        return null;
      }

      const contract = this.getTokenContract(tokenAddress);
      const decimalsResult = await contract.call("decimals");

      return Number(decimalsResult);
    } catch (error) {
      console.error("Failed to get token decimals:", error);
      return null;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(
    tokenAddress: string,
    userAddress: string
  ): Promise<string | null> {
    console.log("getTokenBalance", tokenAddress, userAddress);
    if (
      !this.isValidAddress(tokenAddress) ||
      !this.isValidAddress(userAddress)
    ) {
      return null;
    }

    const contract = this.getTokenContract(tokenAddress);
    const balanceResult = await contract.call("balance_of", [userAddress]);

    return balanceResult.toString();
  }

  /**
   * Get token allowance for spender
   */
  async getTokenAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<string | null> {
    try {
      if (
        !this.isValidAddress(tokenAddress) ||
        !this.isValidAddress(ownerAddress) ||
        !this.isValidAddress(spenderAddress)
      ) {
        return null;
      }

      const contract = this.getTokenContract(tokenAddress);
      const allowanceResult = await contract.call("allowance", [
        ownerAddress,
        spenderAddress,
      ]);

      return allowanceResult.toString();
    } catch (error) {
      console.error("Failed to get token allowance:", error);
      return null;
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<TransactionResult> {
    try {
      if (!this.account) {
        return {
          success: false,
          error: "Account not connected",
          message: "Please connect your wallet first",
        };
      }

      if (
        !this.isValidAddress(tokenAddress) ||
        !this.isValidAddress(spenderAddress)
      ) {
        return {
          success: false,
          error: "Invalid address",
          message: "Invalid token or spender address",
        };
      }

      const contract = new Contract(erc20Abi, tokenAddress, this.account);
      const { transaction_hash } = await contract.approve(
        spenderAddress,
        amount
      );

      return {
        success: true,
        transactionHash: transaction_hash,
        message: "Token approval successful",
      };
    } catch (error) {
      console.error("Failed to approve token:", error);
      return {
        success: false,
        error: this.formatError(error),
        message: "Failed to approve token",
      };
    }
  }

  /**
   * Clear cached contracts (useful when switching networks)
   */
  clearCache(): void {
    this.tokenContracts.clear();
  }
}

// Helper function to get network name from config
export const getNetworkName = (networkConfig: any): string => {
  return networkConfig?.network || "mainnet";
};

// Export factory function to create service with network
export const createERC20Service = (network?: string) =>
  new ERC20Service(network);

// Export default singleton instance (sepolia)
export const erc20Service = new ERC20Service();
