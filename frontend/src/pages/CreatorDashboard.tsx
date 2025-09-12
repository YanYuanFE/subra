import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { SubscriptionPlan } from "@/services/types";
import { TOKEN_ADDRESSES, DEFAULT_NETWORK } from "@/services/config";
import {
  useTotalPlans,
  useUserPlans,
  useUserPlansRevenue,
  useCreatePlan,
  useReactivatePlan,
  useDeactivatePlan,
  useNetworkStatus,
  useTokenSymbols,
} from "@/hooks/useSubraQueries";
import {
  Plus,
  DollarSign,
  Users,
  Calendar,
  Copy,
  CheckCircle,
  BarChart3,
  Share,
  Eye,
  Loader2,
} from "lucide-react";
import { useAccount, useNetwork } from "@starknet-react/core";

// Using SubscriptionPlan from services/types.ts

const CreatorDashboard = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    token: "",
    price: "",
    period: "",
    recipientAddress: "",
  });

  const [formErrors, setFormErrors] = useState({
    token: "",
    price: "",
    period: "",
    recipientAddress: "",
  });
  const { address } = useAccount();

  // 使用React Query hooks
  const {
    data: totalPlans,
    isLoading: totalPlansLoading,
    error: totalPlansError,
  } = useTotalPlans();
  const {
    data: userPlansData,
    isLoading: userPlansLoading,
    error: userPlansError,
  } = useUserPlans(address);
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
  } = useUserPlansRevenue(address);
  const { chain } = useNetwork();
  const currentNetwork = TOKEN_ADDRESSES[chain.network];
  const createPlanMutation = useCreatePlan();
  const reactivatePlanMutation = useReactivatePlan();
  const deactivatePlanMutation = useDeactivatePlan();

  // 获取所有token symbols
  const tokenAddresses = userPlansData?.map((item) => item.plan.token) || [];
  const { data: tokenSymbols, isLoading: tokenSymbolsLoading } =
    useTokenSymbols(tokenAddresses);

  // 合并loading状态和错误状态
  const isQueryLoading =
    totalPlansLoading ||
    userPlansLoading ||
    revenueLoading ||
    tokenSymbolsLoading;
  const hasQueryError = totalPlansError || userPlansError || revenueError;
  const queryErrorMessage =
    totalPlansError?.message ||
    userPlansError?.message ||
    revenueError?.message;

  // 格式化token显示
  const formatTokenDisplay = (tokenAddress: string) => {
    const symbol = tokenSymbols?.[tokenAddress];
    return symbol || `${tokenAddress.slice(0, 8)}...`;
  };

  // 重试功能
  const handleRetry = () => {
    window.location.reload();
  };

  // 计划管理功能
  const handleActivatePlan = async (planId: string) => {
    try {
      await reactivatePlanMutation.mutateAsync(planId);
      toast.success("Subscription plan has been successfully activated", {
        description: "Plan Activated",
      });
    } catch (error) {
      console.error("Failed to activate plan:", error);
      toast.error("Unable to activate plan, please try again", {
        description: "Activation Failed",
      });
    }
  };

  const handleDeactivatePlan = async (planId: string) => {
    try {
      await deactivatePlanMutation.mutateAsync(planId);
      toast.success("Subscription plan has been successfully deactivated", {
        description: "Plan Deactivated",
      });
    } catch (error) {
      console.error("Failed to deactivate plan:", error);
      toast.error("Unable to deactivate plan, please try again", {
        description: "Deactivation Failed",
      });
    }
  };

  // 使用从服务层获取的计划数据
  const userPlans = userPlansData || [];

  // Load plans from contract on component mount
  useEffect(() => {
    if (totalPlans !== undefined) {
      console.log("Total plans:", totalPlans);
    }
    if (userPlansData) {
      console.log("User plans:", userPlansData);
    }
  }, [totalPlans, userPlansData]);

  // 使用从revenueData获取的统计数据
  const totalSubscribers = revenueData?.totalSubscribers || 0;
  const totalRevenue = revenueData?.totalRevenue || 0;
  const averageRevenue = revenueData?.averageRevenue || 0;

  // 表单验证函数
  const validateForm = () => {
    const errors = {
      token: "",
      price: "",
      period: "",
      recipientAddress: "",
    };

    // 验证token选择
    if (!formData.token) {
      errors.token = "Please select a token";
    }

    // 验证价格
    if (!formData.price) {
      errors.price = "Price is required";
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        errors.price = "Price must be a positive number";
      } else if (price > 1000000) {
        errors.price = "Price cannot exceed 1,000,000";
      }
    }

    // 验证周期
    if (!formData.period) {
      errors.period = "Please select a period";
    }

    // 验证收款地址
    if (!formData.recipientAddress) {
      errors.recipientAddress = "Recipient address is required";
    } else {
      // StarkNet地址格式验证 (0x开头，64位十六进制)
      const addressRegex = /^0x[0-9a-fA-F]{63,64}$/;
      if (!addressRegex.test(formData.recipientAddress)) {
        errors.recipientAddress = "Invalid StarkNet address format";
      }
    }

    setFormErrors(errors);
    return Object.values(errors).every((error) => error === "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting.", {
        description: "Validation Error",
      });
      return;
    }

    try {
      const result = await createPlanMutation.mutateAsync({
        name: formData.name,
        recipient: formData.recipientAddress,
        token: formData.token,
        price: formData.price,
        period: parseInt(formData.period), // Convert period to seconds
      });

      setShowCreateForm(false);
      resetForm();

      toast.success("Your subscription plan is now live and ready to share.", {
        description: "Plan Created Successfully!",
      });
    } catch (error) {
      console.error("Failed to create plan:", error);

      // 提供更详细的错误信息
      let errorMessage =
        "Failed to create subscription plan. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage =
            "Insufficient funds to create the plan. Please check your wallet balance.";
        } else if (error.message.includes("rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        } else if (error.message.includes("network")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage, {
        description: "Plan Creation Failed",
      });
    }
  };

  const handleShare = (planId: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/subscribe/${planId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(
      "Share this link with your users to let them subscribe to your plan.",
      {
        description: "Link Copied!",
      }
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      token: "",
      price: "",
      period: "",
      recipientAddress: "",
    });
    setFormErrors({
      token: "",
      price: "",
      period: "",
      recipientAddress: "",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage your subscription plans
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            resetForm();
          }}
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {/* Error Display */}
      {hasQueryError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Data Loading Failed:</span>
                <span>{queryErrorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Subscribers
                </p>
                <p className="text-2xl font-bold">{totalSubscribers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{userPlans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Create New Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Premium Newsletter"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                  {formErrors.price && (
                    <p className="text-sm text-red-500">{formErrors.price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select
                    value={formData.token}
                    onValueChange={(value) =>
                      setFormData({ ...formData, token: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentNetwork.USDC}>USDC</SelectItem>
                      <SelectItem value={currentNetwork.ETH}>ETH</SelectItem>
                      <SelectItem value={currentNetwork.STRK}>STRK</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.token && (
                    <p className="text-sm text-red-500">{formErrors.token}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="9.99"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period (in seconds)</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value) =>
                      setFormData({ ...formData, period: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2592000">Monthly (30 days)</SelectItem>
                      <SelectItem value="31536000">
                        Yearly (365 days)
                      </SelectItem>
                      <SelectItem value="604800">Weekly (7 days)</SelectItem>
                      <SelectItem value="86400">Daily (1 day)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.period && (
                    <p className="text-sm text-red-500">{formErrors.period}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Recipient Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={formData.recipientAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recipientAddress: e.target.value,
                    })
                  }
                  required
                />
                {formErrors.recipientAddress && (
                  <p className="text-sm text-red-500">
                    {formErrors.recipientAddress}
                  </p>
                )}
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Plan"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle>Your Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPlans.map((item) => (
              <div
                key={item.planId}
                className="border rounded-lg p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Plan {item.plan.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {item.plan.displayPrice} {item.plan.tokenSymbol}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {Math.floor(item.plan.periodLength / 86400)} days
                        </span>
                      </span>
                      <Badge
                        variant={item.plan.isActive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {item.plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {item.plan.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivatePlan(item.planId)}
                        disabled={deactivatePlanMutation.isPending}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {deactivatePlanMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Deactivate"
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivatePlan(item.planId)}
                        disabled={reactivatePlanMutation.isPending}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        {reactivatePlanMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Activate"
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleShare(item.planId)}
                      className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    >
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {item.plan.totalSubscribers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current Subscribers
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-success">
                      ${item.plan.totalRevenue} {item.plan.tokenSymbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Revenue
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-accent">
                      ${(parseFloat(item.plan.displayPrice) || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Per Subscriber
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorDashboard;
