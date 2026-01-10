import { Link } from 'react-router-dom'
import { useAdminStats } from '@/hooks/use-admin'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  CreditCard,
  Bell,
  TrendingUp,
  Loader2,
  ArrowRight,
  MessageCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and statistics</p>
        </div>
        <Link to="/admin/users">
          <Button className="gap-2">
            <Users className="h-4 w-4" />
            Manage Users
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.users.total || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Active Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-success">{stats?.users.active || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                With Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.users.withTelegram || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Subscriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.subscriptions.total || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Per User
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.subscriptions.averagePerUser || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Total Sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.notifications.total || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.notifications.today || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Failed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{stats?.notifications.failed || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Success Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{stats?.notifications.successRate || 100}%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
