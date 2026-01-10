import { Link } from "react-router-dom";
import {
  useSubscriptions,
  useSubscriptionStats,
  useDeleteSubscription,
  useTestSubscriptionNotification,
} from "@/hooks/use-subscriptions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  CreditCard,
  Calendar,
  DollarSign,
  Bell,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  Send,
  TrendingUp,
  Coins,
} from "lucide-react";
import { useState } from "react";
import type { Subscription, CostBreakdown } from "@/types";

function getDaysUntilRenewal(renewalDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  const diffTime = renewal.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getRenewalBadge(daysUntil: number) {
  if (daysUntil < 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Overdue
      </Badge>
    );
  }
  if (daysUntil <= 3) {
    return <Badge variant="destructive">In {daysUntil} days</Badge>;
  }
  if (daysUntil <= 7) {
    return <Badge variant="warning">In {daysUntil} days</Badge>;
  }
  if (daysUntil <= 30) {
    return <Badge variant="secondary">In {daysUntil} days</Badge>;
  }
  return <Badge variant="outline">In {daysUntil} days</Badge>;
}

function SubscriptionCard({
  subscription,
  onDelete,
}: {
  subscription: Subscription;
  onDelete: () => void;
}) {
  const daysUntil = getDaysUntilRenewal(subscription.renewalDate);
  const testNotification = useTestSubscriptionNotification();

  const handleTestNotification = async () => {
    try {
      await testNotification.mutateAsync(subscription.id);
      toast({
        title: "Sent",
        description: "Test notification sent to Telegram",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="card-hover group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">
                {subscription.serviceName}
              </h3>
              {getRenewalBadge(daysUntil)}
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Renews{" "}
                  {new Date(subscription.renewalDate).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="truncate">{subscription.paymentMethod}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {subscription.accountName}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-primary">
              {subscription.currency === "USD" ? "$" : subscription.currency}{" "}
              {parseFloat(subscription.cost).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              /{subscription.billingCycle}
            </div>
            <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleTestNotification}
                disabled={testNotification.isPending}
                title="Send Test Notification"
              >
                {testNotification.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Link to={`/subscriptions/${subscription.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions({
    active: true,
  });
  const { data: stats, isLoading: statsLoading } = useSubscriptionStats();
  const deleteSubscription = useDeleteSubscription();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    subscription: Subscription | null;
  }>({
    open: false,
    subscription: null,
  });

  const handleDelete = async () => {
    if (!deleteDialog.subscription) return;

    try {
      await deleteSubscription.mutateAsync(deleteDialog.subscription.id);
      toast({
        title: "Deleted",
        description: "Subscription removed successfully",
      });
      setDeleteDialog({ open: false, subscription: null });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    }
  };

  if (subsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your subscriptions</p>
        </div>
        <Link to="/subscriptions/new">
          <Button className="gap-2 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {stats?.totalSubscriptions || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              ${stats?.monthlyCost?.amount?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">USD equivalent</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Yearly Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              ${stats?.yearlyCost?.amount?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">USD equivalent</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Upcoming Renewals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {stats?.upcomingRenewalsCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Currency Breakdown */}
      {stats?.costBreakdown && stats.costBreakdown.length > 1 && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Cost by Currency
            </CardTitle>
            <CardDescription>
              Your subscriptions across different currencies
              {stats.ratesUpdatedAt && (
                <span className="ml-2 text-xs">
                  (Rates updated: {new Date(stats.ratesUpdatedAt).toLocaleDateString()})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.costBreakdown.map((item: CostBreakdown) => (
                <div
                  key={item.currency}
                  className="p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="font-mono">
                      {item.currency}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold">
                    {item.currency === "USD" ? "$" : ""}{item.amount.toFixed(2)}
                  </p>
                  {item.currency !== "USD" && (
                    <p className="text-xs text-muted-foreground">
                      ≈ ${item.convertedToUSD.toFixed(2)} USD
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>
            All your active subscriptions in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions && subscriptions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {subscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onDelete={() =>
                    setDeleteDialog({ open: true, subscription: sub })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">No subscriptions yet</h3>
                <p className="text-muted-foreground">
                  Add your first subscription to start tracking
                </p>
              </div>
              <Link to="/subscriptions/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Subscription
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            subscription: open ? deleteDialog.subscription : null,
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialog.subscription?.serviceName}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, subscription: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSubscription.isPending}
            >
              {deleteSubscription.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
