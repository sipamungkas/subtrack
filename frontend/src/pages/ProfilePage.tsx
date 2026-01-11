import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useProfile, useUpdateProfile, useConnectTelegram, useDisconnectTelegram, useTestTelegram } from '@/hooks/use-user'
import { useSubscriptions } from '@/hooks/use-subscriptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import {
  User,
  Mail,
  CreditCard,
  Bell,
  Loader2,
  Save,
  MessageCircle,
  Link as LinkIcon,
  Unlink,
  Send,
  Copy,
  Check
} from 'lucide-react'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: subscriptions } = useSubscriptions({ active: true })
  const updateProfile = useUpdateProfile()
  const connectTelegram = useConnectTelegram()
  const disconnectTelegram = useDisconnectTelegram()
  const testTelegram = useTestTelegram()

  const [name, setName] = useState(user?.name || '')
  const [telegramCode, setTelegramCode] = useState<{ code: string; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync({ name })
      await refreshUser()
      toast({ title: 'Success', description: 'Profile updated successfully' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
    }
  }

  const handleConnectTelegram = async () => {
    try {
      const data = await connectTelegram.mutateAsync()
      setTelegramCode({ code: data.code, message: data.message })
    } catch {
      toast({ title: 'Error', description: 'Failed to generate verification code', variant: 'destructive' })
    }
  }

  const handleDisconnectTelegram = async () => {
    try {
      await disconnectTelegram.mutateAsync()
      await refreshUser()
      toast({ title: 'Disconnected', description: 'Telegram has been disconnected' })
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect Telegram', variant: 'destructive' })
    }
  }

  const handleTestTelegram = async () => {
    try {
      await testTelegram.mutateAsync()
      toast({ title: 'Sent!', description: 'Test notification sent to Telegram' })
    } catch {
      toast({ title: 'Error', description: 'Failed to send test notification', variant: 'destructive' })
    }
  }

  const handleCopyCode = () => {
    if (telegramCode) {
      navigator.clipboard.writeText(telegramCode.message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const subscriptionCount = subscriptions?.length || 0
  const subscriptionLimit = profile?.subscriptionLimit || 15

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-background/50"
              />
            </div>

            <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Usage */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Usage
          </CardTitle>
          <CardDescription>Your current subscription limit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Subscriptions</span>
              <Badge variant={subscriptionCount >= subscriptionLimit ? 'destructive' : 'secondary'}>
                {subscriptionCount} / {subscriptionLimit}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min((subscriptionCount / subscriptionLimit) * 100, 100)}%` }}
              />
            </div>

            {subscriptionCount >= subscriptionLimit && (
              <p className="text-sm text-destructive">
                You've reached your subscription limit. Contact support to upgrade.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Telegram Notifications
          </CardTitle>
          <CardDescription>
            Connect Telegram to receive subscription reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.telegramChatId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <MessageCircle className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="font-medium text-success">Telegram Connected</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive reminders before subscription renewals
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={testTelegram.isPending}
                  className="gap-2"
                >
                  {testTelegram.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Test
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnectTelegram}
                  disabled={disconnectTelegram.isPending}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  {disconnectTelegram.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : telegramCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm">
                  Send this command to{' '}
                  <strong>@{import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SubnudgeBot'}</strong>:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-3 rounded-lg font-mono text-sm break-all">
                    /start {telegramCode.code}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopyCode}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This code expires in 15 minutes
                </p>
              </div>

              <Button
                variant="ghost"
                onClick={() => setTelegramCode(null)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Telegram account to receive reminders before your subscriptions renew.
              </p>
              <Button
                onClick={handleConnectTelegram}
                disabled={connectTelegram.isPending}
                className="gap-2"
              >
                {connectTelegram.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating code...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Connect Telegram
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
