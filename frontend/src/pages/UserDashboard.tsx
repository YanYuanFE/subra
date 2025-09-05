import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { SubscriptionData } from "@/services/types";
import { useAccount } from "@starknet-react/core";
import {
  useUserSubscriptions,
  useSubscribe,
  useRenewSubscription,
  useCancelSubscription,
  useTotalPlans,
} from "@/hooks/useSubraQueries";
import {
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
  Wallet,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface UserSubscription {
  planId: string;
  name: string;
  price: string;
  token: string;
  renewalDate: string;
  status: "active" | "upcoming" | "canceled";
  canceledDate?: string;
  subscriptionData?: SubscriptionData;
}

const UserDashboard = () => {
  const { address: userAddress, status: connectionStatus } = useAccount();

  // 使用React Query hooks
  const {
    data: userSubscriptions,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useUserSubscriptions(userAddress);
  const { data: totalPlans } = useTotalPlans();
  const subscribeMutation = useSubscribe();
  const renewMutation = useRenewSubscription();
  const cancelMutation = useCancelSubscription();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Your subscription to Netflix Pro has been renewed",
      type: "success",
    },
    {
      id: 2,
      message:
        "Payment failed for Spotify Premium - Please update payment method",
      type: "error",
    },
  ]);

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  );
  const upcomingRenewals = subscriptions.filter(
    (sub) => sub.status === "upcoming"
  );
  const canceledSubscriptions = subscriptions.filter(
    (sub) => sub.status === "canceled"
  );

  const totalMonthlySpend = activeSubscriptions.reduce(
    (sum, sub) => sum + parseFloat(sub.price),
    0
  );

  const dismissNotification = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleCancel = async (planId: string) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first", {
        description: "Error",
      });
      return;
    }

    try {
      await cancelMutation.mutateAsync({ planId, userAddress });

      // Update local state
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.planId === planId
            ? {
                ...sub,
                status: "canceled" as const,
                canceledDate: new Date().toISOString().split("T")[0],
              }
            : sub
        )
      );

      toast.success("Subscription canceled successfully", {
        description: "Success",
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription", {
        description: "Error",
      });
    }
  };

  const handleRenew = async (planId: string) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first", {
        description: "Error",
      });
      return;
    }

    try {
      await renewMutation.mutateAsync({ planId, userAddress });

      toast.success("Subscription renewed successfully", {
        description: "Success",
      });

      // Refresh subscriptions
      refetchSubscriptions();
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast.error("Failed to renew subscription", {
        description: "Error",
      });
    }
  };

  console.log(userSubscriptions, "user");

  useEffect(() => {
    if (userSubscriptions && userSubscriptions.length > 0) {
      // 转换数据格式以匹配现有的UI结构
      const formattedSubscriptions = userSubscriptions.map((sub) => {
        const endTime = sub.subscription?.endTime || 0;
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpiringSoon =
          endTime > 0 && endTime - currentTime < 7 * 24 * 60 * 60; // 7天内到期

        let status: "active" | "upcoming" | "canceled" = "canceled";
        if (sub.isActive) {
          status = isExpiringSoon ? "upcoming" : "active";
        }

        return {
          planId: sub.planId,
          name: sub.plan.name || `Plan ${sub.planId}`,
          price: sub.plan.displayPrice || sub.plan.price,
          token: sub.plan.tokenSymbol || "USDC",
          renewalDate:
            endTime > 0
              ? new Date(endTime * 1000).toISOString().split("T")[0]
              : "2024-09-15",
          status,
          canceledDate:
            !sub.isActive && sub.subscription
              ? new Date(sub.subscription.endTime * 1000)
                  .toISOString()
                  .split("T")[0]
              : undefined,
          subscriptionData: sub.subscription || {
            startTime: 0,
            endTime: 0,
            isActive: false,
            renewalsCount: 0,
          },
        };
      });
      setSubscriptions(formattedSubscriptions as UserSubscription[]);
    } else {
      // 如果没有订阅数据，设置为空数组
      setSubscriptions([]);
    }
  }, [userSubscriptions]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your decentralized subscriptions
          </p>
        </div>
        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="text-sm opacity-90">Monthly Spend</p>
              <p className="text-xl font-bold">
                ${totalMonthlySpend.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Alert
              key={notification.id}
              className={`animate-fade-in ${
                notification.type === "success"
                  ? "border-success/50 bg-success/10"
                  : "border-destructive/50 bg-destructive/10"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className="flex items-center justify-between">
                <span>{notification.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Profile Section */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <span>Wallet Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Connected Wallet
              </p>
              <p className="font-mono text-sm bg-muted px-3 py-2 rounded">
                {userAddress
                  ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
                  : "Not connected"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="font-semibold">1,245.67 USDC • 0.85 ETH</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Subscriptions</span>
            <Badge variant="secondary">{activeSubscriptions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading subscriptions...</span>
            </div>
          ) : activeSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active subscriptions found</p>
              {connectionStatus !== "connected" && (
                <p className="text-sm mt-2">
                  Please connect your wallet to view subscriptions
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSubscriptions.map((subscription) => (
                <div
                  key={subscription.planId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{subscription.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {subscription.price} {subscription.token}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Renews {subscription.renewalDate}</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(subscription.planId)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Renewals */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upcoming Renewals</span>
            <Badge
              variant="secondary"
              className="bg-warning/20 text-warning-foreground"
            >
              {upcomingRenewals.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingRenewals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No upcoming renewals</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingRenewals.map((subscription) => (
                <div
                  key={subscription.planId}
                  className="flex items-center justify-between p-4 border border-warning/30 rounded-lg bg-warning/5"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{subscription.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {subscription.price} {subscription.token}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1 text-warning">
                        <Clock className="w-4 h-4" />
                        <span>Due {subscription.renewalDate}</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRenew(subscription.planId)}
                    className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  >
                    Renew Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canceled Subscriptions */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Canceled Subscriptions</span>
            <Badge variant="outline">{canceledSubscriptions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canceledSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No canceled subscriptions</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {canceledSubscriptions.map((subscription) => (
                <div
                  key={subscription.planId}
                  className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{subscription.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {subscription.price} {subscription.token}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <X className="w-4 h-4" />
                        <span>Canceled {subscription.canceledDate}</span>
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    Canceled
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
