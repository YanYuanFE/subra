import { Wallet, Copy, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useStarknetkitConnectModal } from "starknetkit";
import { shortenAddress } from "@/lib/utils";
import { Card } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

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

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  return address ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Card className="px-3 py-2 bg-success/10 border-success/20 cursor-pointer hover:bg-success/15 transition-colors">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm font-medium">{shortenAddress(address)}</span>
          </div>
        </Card>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
