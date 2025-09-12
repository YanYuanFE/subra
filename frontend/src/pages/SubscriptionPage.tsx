import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "@starknet-react/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  usePlanDetails,
  useSubscriptionStatus,
  useSubscribe,
  useTokenSymbol,
  QUERY_KEYS,
} from "@/hooks/useSubraQueries";
import { toast } from "sonner";

const SubscriptionPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { account, address } = useAccount();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);

  // 获取计划详情
  const {
    data: plan,
    isLoading: planLoading,
    error: planError,
  } = usePlanDetails(planId);

  // 获取用户订阅状态
  const { data: isSubscribed, isLoading: statusLoading } =
    useSubscriptionStatus(planId, address);

  // 获取token symbol
  const { data: tokenSymbol, isLoading: tokenLoading } = useTokenSymbol(
    plan?.token
  );

  // 订阅mutation
  const subscribeMutation = useSubscribe();

  // 处理订阅
  const handleSubscribe = async () => {
    if (!account || !address || !planId) {
      toast.error("Please connect your wallet first", {
        description: "Error",
      });
      return;
    }

    setIsSubscribing(true);
    try {
      await subscribeMutation.mutateAsync({ planId, userAddress: address });

      // 手动刷新订阅状态查询以确保UI立即更新
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.SUBSCRIPTION_STATUS, planId, address],
      });

      toast.success("You have successfully subscribed to this plan", {
        description: "Subscription Successful",
      });
    } catch (error) {
      console.error("Subscription failed:", error);
      toast.error("An error occurred during subscription, please try again", {
        description: "Subscription Failed",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  // 分享功能
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Subscription link has been copied to clipboard", {
        description: "Link Copied",
      });
    } catch (error) {
      toast.error(
        "Unable to copy link, please manually copy the URL from address bar",
        {
          description: "Copy Failed",
        }
      );
    }
  };

  // 格式化价格显示
  const formatPrice = (
    price: string,
    token: string,
    symbol?: string | null
  ) => {
    const numPrice = parseFloat(price);
    const displayToken = symbol || token.slice(0, 8) + "...";
    return `${numPrice} ${displayToken}`;
  };

  // 格式化周期显示
  const formatPeriod = (periodLength: number) => {
    const days = Math.floor(periodLength / (24 * 60 * 60));
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    }
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  if (planLoading || statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Plan does not exist or failed to load. Please check if the link is
            correct.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => navigate("/")}
          className="mt-4"
          variant="outline"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Plan</h1>
        <p className="text-muted-foreground">View plan details and subscribe</p>
      </div>

      {/* 计划详情卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Plan {plan.name}</CardTitle>
              <CardDescription className="mt-1">
                Creator: {plan.recipient}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={plan.isActive ? "default" : "secondary"}>
                {plan.isActive ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 价格信息 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium">Subscription Price</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {tokenLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                formatPrice(plan.displayPrice, plan.token, tokenSymbol)
              )}
            </span>
          </div>

          {/* 周期信息 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Subscription Period</span>
            </div>
            <span className="text-lg font-semibold text-blue-600">
              {formatPeriod(plan.periodLength)}
            </span>
          </div>

          <Separator />

          {/* 统计信息 */}
          <div className="grid grid-cols-1 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {plan.totalSubscribers || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Subscribers
              </div>
            </div>
          </div>

          <Separator />

          {/* 订阅状态和操作 */}
          <div className="space-y-4">
            {address ? (
              <>
                {isSubscribed ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 stroke-success" />
                    <AlertDescription>
                      You have already subscribed to this plan
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    <Alert>
                      <AlertDescription>
                        You have not subscribed to this plan yet. Click the
                        button below to start subscribing.
                      </AlertDescription>
                    </Alert>
                    {plan.isActive ? (
                      <Button
                        onClick={handleSubscribe}
                        disabled={isSubscribing || subscribeMutation.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {isSubscribing || subscribeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Subscribing...
                          </>
                        ) : (
                          `Subscribe - ${formatPrice(
                            plan.displayPrice,
                            plan.token,
                            tokenSymbol
                          )}`
                        )}
                      </Button>
                    ) : (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          This plan has been deactivated by the creator and is
                          temporarily unavailable for subscription.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Please connect your wallet first to view subscription status
                  and subscribe.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 分享按钮 */}
          <div className="pt-4">
            <Button onClick={handleShare} variant="outline" className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share this subscription page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 返回按钮 */}
      <div className="text-center">
        <Button onClick={() => navigate("/")} variant="ghost">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionPage;
