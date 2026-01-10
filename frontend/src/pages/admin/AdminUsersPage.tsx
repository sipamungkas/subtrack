import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminUsers, useUpdateUserLimit, useUpdateUserStatus } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  CreditCard,
  Settings,
  UserX,
  UserCheck
} from 'lucide-react'
import type { AdminUser } from '@/types'

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminUsers(page, 10)
  const updateLimit = useUpdateUserLimit()
  const updateStatus = useUpdateUserStatus()

  const [limitDialog, setLimitDialog] = useState<{ open: boolean; user: AdminUser | null; newLimit: string }>({
    open: false,
    user: null,
    newLimit: '',
  })

  const handleUpdateLimit = async () => {
    if (!limitDialog.user) return

    const limit = parseInt(limitDialog.newLimit)
    if (isNaN(limit) || limit < 1) {
      toast({ title: 'Error', description: 'Please enter a valid limit', variant: 'destructive' })
      return
    }

    try {
      await updateLimit.mutateAsync({ userId: limitDialog.user.id, subscriptionLimit: limit })
      toast({ title: 'Updated', description: 'Subscription limit updated' })
      setLimitDialog({ open: false, user: null, newLimit: '' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update limit', variant: 'destructive' })
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await updateStatus.mutateAsync({ userId: user.id, isActive: !user.isActive })
      toast({
        title: user.isActive ? 'Deactivated' : 'Activated',
        description: `User ${user.email} has been ${user.isActive ? 'deactivated' : 'activated'}`,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and limits</p>
        </div>
      </div>

      {/* Users List */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {data?.pagination.total || 0} total users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.data.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{user.email}</span>
                    {user.role === 'admin' && (
                      <Badge variant="default">Admin</Badge>
                    )}
                    {!user.isActive && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      {user.subscriptionCount}/{user.subscriptionLimit}
                    </span>
                    {user.telegramConnected && (
                      <span className="flex items-center gap-1 text-success">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Connected
                      </span>
                    )}
                    <span>
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLimitDialog({
                      open: true,
                      user,
                      newLimit: String(user.subscriptionLimit)
                    })}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Limit
                  </Button>
                  <Button
                    variant={user.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleStatus(user)}
                    disabled={updateStatus.isPending}
                  >
                    {user.isActive ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {data?.data.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Limit Dialog */}
      <Dialog open={limitDialog.open} onOpenChange={(open) => setLimitDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Subscription Limit</DialogTitle>
            <DialogDescription>
              Set a new subscription limit for {limitDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="limit">New Limit</Label>
            <Input
              id="limit"
              type="number"
              min="1"
              max="1000"
              value={limitDialog.newLimit}
              onChange={(e) => setLimitDialog((prev) => ({ ...prev, newLimit: e.target.value }))}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Current usage: {limitDialog.user?.subscriptionCount || 0} subscriptions
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialog({ open: false, user: null, newLimit: '' })}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLimit} disabled={updateLimit.isPending}>
              {updateLimit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Limit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
