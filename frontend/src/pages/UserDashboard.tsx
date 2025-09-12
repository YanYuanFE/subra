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
  useAutoRenewalAuth,
  useEnableAutoRenewal,
  useDisableAutoRenewal,
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
  Settings,
  RotateCcw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSubscription {
  planId: string;
  name: string;
  price: string;
  token: string;
  renewalDate: string;
  status: "active" | "upcoming" | "expired";
  expiredDate?: string;
  subscriptionData?: SubscriptionData;
}

// SubscriptionCard component for active subscriptions with auto renewal
interface SubscriptionCardProps {
  subscription: UserSubscription;
  userAddress?: string;
  onCancel: (planId: string) => void;
  onAutoRenewalToggle: (planId: string, enabled: boolean) => void;
}

const SubscriptionCard = ({
  subscription,
  userAddress,
  onCancel,
  onAutoRenewalToggle,
}: SubscriptionCardProps) => {
  const { data: autoRenewalAuth } = useAutoRenewalAuth(
    subscription.planId,
    userAddress
  );

  const isAutoRenewalEnabled = autoRenewalAuth?.enabled || false;

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3">
      {/* Main subscription info */}
      <div className="flex items-center justify-between">
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
          onClick={() => onCancel(subscription.planId)}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          Cancel
        </Button>
      </div>

      {/* Auto renewal section */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center space-x-2">
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Auto Renewal</span>
          {isAutoRenewalEnabled && autoRenewalAuth && (
            <Badge variant="secondary" className="text-xs">
              {autoRenewalAuth.remainingRenewals}/{autoRenewalAuth.maxRenewals}{" "}
              left
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isAutoRenewalEnabled && (
            <span className="text-xs text-muted-foreground">
              Max: {autoRenewalAuth?.maxPrice} {subscription.token}
            </span>
          )}
          <Switch
            checked={isAutoRenewalEnabled}
            onCheckedChange={(checked) =>
              onAutoRenewalToggle(subscription.planId, checked)
            }
          />
        </div>
      </div>
    </div>
  );
};

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
  const enableAutoRenewalMutation = useEnableAutoRenewal();
  const disableAutoRenewalMutation = useDisableAutoRenewal();

  // Auto renewal settings state
  const [autoRenewalSettings, setAutoRenewalSettings] = useState<{
    planId: string;
    maxRenewals: number;
    maxPrice: string;
  } | null>(null);
  const [isAutoRenewalDialogOpen, setIsAutoRenewalDialogOpen] = useState(false);

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  );
  const upcomingRenewals = subscriptions.filter(
    (sub) => sub.status === "upcoming"
  );
  const expiredSubscriptions = subscriptions.filter(
    (sub) => sub.status === "expired"
  );

  const totalMonthlySpend = activeSubscriptions.reduce(
    (sum, sub) => sum + parseFloat(sub.price),
    0
  );

  // const dismissNotification = (id: number) => {
  //   setNotifications(notifications.filter((n) => n.id !== id));
  // };

  // Auto renewal handlers
  const handleAutoRenewalToggle = async (planId: string, enabled: boolean) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (enabled) {
      // Find the subscription to get its current price
      const subscription = subscriptions.find((sub) => sub.planId === planId);
      const currentPrice = subscription ? parseFloat(subscription.price) : 100;
      // Set default max price to 1.5x current price to allow for price increases
      const defaultMaxPrice = Math.ceil(currentPrice * 1.5).toString();

      // Open settings dialog for enabling auto renewal
      setAutoRenewalSettings({
        planId,
        maxRenewals: 12, // Default to 12 renewals
        maxPrice: defaultMaxPrice, // Default max price based on current price
      });
      setIsAutoRenewalDialogOpen(true);
    } else {
      // Disable auto renewal directly
      try {
        await disableAutoRenewalMutation.mutateAsync(planId);
        toast.success("Auto renewal disabled successfully");
      } catch (error) {
        console.error("Failed to disable auto renewal:", error);
        toast.error("Failed to disable auto renewal");
      }
    }
  };

  const handleEnableAutoRenewal = async () => {
    if (!autoRenewalSettings || !userAddress) return;

    try {
      await enableAutoRenewalMutation.mutateAsync({
        planId: autoRenewalSettings.planId,
        maxRenewals: autoRenewalSettings.maxRenewals,
        maxPrice: autoRenewalSettings.maxPrice,
      });
      toast.success("Auto renewal enabled successfully");
      setIsAutoRenewalDialogOpen(false);
      setAutoRenewalSettings(null);
    } catch (error) {
      console.error("Failed to enable auto renewal:", error);
      toast.error("Failed to enable auto renewal");
    }
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
                status: "expired" as const,
                expiredDate: new Date().toISOString().split("T")[0],
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
      const formattedSubscriptions = userSubscriptions
        .map((sub) => {
          const endTime = sub.subscription?.endTime || 0;
          const currentTime = Math.floor(Date.now() / 1000);
          const isExpiringSoon =
            endTime > 0 && endTime - currentTime < 7 * 24 * 60 * 60; // 7天内到期

          let status: "active" | "upcoming" | "expired" = "expired";
          if (sub.subscription?.isActive) {
            // 如果订阅活跃且还没到期，根据是否即将到期来判断状态
            if (endTime > currentTime) {
              status = isExpiringSoon ? "upcoming" : "active";
            } else {
              // 活跃但已过期，这种情况理论上不应该发生，但标记为过期
              status = "expired";
            }
          } else if (
            sub.subscription &&
            !sub.subscription.isActive &&
            endTime > 0
          ) {
            // 有订阅数据但不活跃，说明是过期的
            status = "expired";
          } else {
            // 没有订阅数据或其他情况，跳过这个订阅
            return null;
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
            expiredDate:
              status === "expired" && sub.subscription
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
        })
        .filter(Boolean); // 过滤掉null值
      console.log(formattedSubscriptions, "ff");
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
        {/* <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="text-sm opacity-90">Monthly Spend</p>
              <p className="text-xl font-bold">
                ${totalMonthlySpend.toFixed(2)}
              </p>
            </div>
          </div>
        </Card> */}
      </div>

      {/* Notifications */}
      {/* {notifications.length > 0 && (
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
      )} */}

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
                <SubscriptionCard
                  key={subscription.planId}
                  subscription={subscription}
                  userAddress={userAddress}
                  onCancel={handleCancel}
                  onAutoRenewalToggle={handleAutoRenewalToggle}
                />
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

      {/* Expired Subscriptions */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expired Subscriptions</span>
            <Badge variant="outline">{expiredSubscriptions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expired subscriptions</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {expiredSubscriptions.map((subscription) => (
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
                        <span>Expired {subscription.expiredDate}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleRenew(subscription.planId)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Renew
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleAutoRenewalToggle(subscription.planId, true)
                      }
                    >
                      Auto Renew
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Renewal Settings Dialog */}
      <Dialog
        open={isAutoRenewalDialogOpen}
        onOpenChange={setIsAutoRenewalDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Auto Renewal Settings</DialogTitle>
            <DialogDescription>
              Configure automatic renewal settings for your subscription.
            </DialogDescription>
          </DialogHeader>
          {autoRenewalSettings && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxRenewals" className="text-right">
                  Max Renewals
                </Label>
                <Input
                  id="maxRenewals"
                  type="number"
                  min="1"
                  max="100"
                  value={autoRenewalSettings.maxRenewals}
                  onChange={(e) =>
                    setAutoRenewalSettings({
                      ...autoRenewalSettings,
                      maxRenewals: parseInt(e.target.value) || 1,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxPrice" className="text-right">
                  Max Price
                </Label>
                <Input
                  id="maxPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={autoRenewalSettings.maxPrice}
                  onChange={(e) =>
                    setAutoRenewalSettings({
                      ...autoRenewalSettings,
                      maxPrice: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="Maximum price per renewal"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  • Auto renewal will stop after{" "}
                  {autoRenewalSettings.maxRenewals} renewals
                </p>
                <p>
                  • Renewal will be skipped if price exceeds{" "}
                  {autoRenewalSettings.maxPrice}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAutoRenewalDialogOpen(false);
                setAutoRenewalSettings(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnableAutoRenewal}
              disabled={enableAutoRenewalMutation.isPending}
              className="bg-gradient-primary hover:shadow-glow"
            >
              {enableAutoRenewalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable Auto Renewal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
