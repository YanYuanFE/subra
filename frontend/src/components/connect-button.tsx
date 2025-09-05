import { Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useStarknetkitConnectModal } from "starknetkit";
import { shortenAddress } from "@/lib/utils";
import { Card } from "./ui/card";

export const ConnectButton = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const { connect, connectors } = useConnect();

  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as any,
  });

  async function connectWallet() {
    try {
      const { connector } = await starknetkitConnectModal();
      if (!connector) {
        return;
      }

      await connect({ connector });
    } catch (error) {
      console.error("Wallet connection failed:", error);
      // Optionally show error message to user
    }
  }

  return address ? (
    <Card
      className="px-3 py-2 bg-success/10 border-success/20"
      onClick={() => disconnect()}
    >
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-success rounded-full"></div>
        <span className="text-sm font-medium">{shortenAddress(address)}</span>
      </div>
    </Card>
  ) : (
    <Button
      onClick={() => connectWallet()}
      className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
};
