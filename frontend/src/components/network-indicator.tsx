import { Button } from "./ui/button";
import { useNetwork, useAccount } from "@starknet-react/core";
import { Wifi } from "lucide-react";

export const NetworkIndicator = () => {
  const { chain } = useNetwork();
  const { address } = useAccount();

  // 只有在钱包连接后才显示网络指示器
  if (!address || !chain) {
    return null;
  }

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case "mainnet":
        return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
      case "sepolia":
      case "alpha-sepolia":
        return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400";
    }
  };

  console.log(chain, "chain");

  const getNetworkDisplayName = (network: string) => {
    switch (network.toLowerCase()) {
      case "mainnet":
        return "Mainnet";
      case "sepolia":
      case "alpha-sepolia":
        return "Sepolia";
      default:
        return network;
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center space-x-1 ${getNetworkColor(
        chain.network
      )} hover:opacity-80`}
    >
      <Wifi className="w-3 h-3" />
      <span className="text-xs font-medium">
        {getNetworkDisplayName(chain.network)}
      </span>
    </Button>
  );
};
