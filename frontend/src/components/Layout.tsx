import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, User, Settings, CreditCard, Plus } from "lucide-react";
import { ConnectButton } from "./connect-button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [walletConnected, setWalletConnected] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">
                  S
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Subra</h1>
                <p className="text-xs text-muted-foreground">
                  Own your subscriptions, on Starknet
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/dashboard")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/creator"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/creator")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Creator</span>
              </Link>
            </nav>

            {/* Wallet */}
            <div className="flex items-center space-x-3">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
