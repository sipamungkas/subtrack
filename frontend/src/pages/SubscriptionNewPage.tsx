import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSubscription } from '@/hooks/use-subscriptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Link } from 'react-router-dom'

const billingCycles = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
]

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'IDR', label: 'IDR (Rp)' },
]

const reminderOptions = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
  { value: 14, label: '14 days before' },
  { value: 30, label: '30 days before' },
]

export function SubscriptionNewPage() {
  const navigate = useNavigate()
  const createSubscription = useCreateSubscription()

  const [formData, setFormData] = useState({
    serviceName: '',
    renewalDate: '',
    cost: '',
    currency: 'USD',
    billingCycle: 'monthly' as const,
    paymentMethod: '',
    accountName: '',
    reminderDays: [7, 3, 1],
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createSubscription.mutateAsync(formData)
      toast({ title: 'Success', description: 'Subscription created successfully' })
      navigate('/dashboard')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create subscription',
        variant: 'destructive',
      })
    }
  }

  const toggleReminder = (days: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(days)
        ? prev.reminderDays.filter((d) => d !== days)
        : [...prev.reminderDays, days].sort((a, b) => b - a),
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Subscription</h1>
          <p className="text-muted-foreground">Track a new subscription</p>
        </div>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <CardDescription>Enter the details of your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                placeholder="Netflix, Spotify, GitHub Pro..."
                value={formData.serviceName}
                onChange={(e) => setFormData((prev) => ({ ...prev, serviceName: e.target.value }))}
                required
                className="bg-background/50"
              />
            </div>

            {/* Cost and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="9.99"
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Billing Cycle and Renewal Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, billingCycle: value as typeof formData.billingCycle }))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCycles.map((cycle) => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalDate">Next Renewal Date *</Label>
                <Input
                  id="renewalDate"
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))}
                  required
                  className="bg-background/50"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Input
                id="paymentMethod"
                placeholder="Visa ending 1234, PayPal, Bank Transfer..."
                value={formData.paymentMethod}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                required
                className="bg-background/50"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">Account/Email Used *</Label>
              <Input
                id="accountName"
                placeholder="your-email@example.com"
                value={formData.accountName}
                onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
                required
                className="bg-background/50"
              />
            </div>

            {/* Reminder Days */}
            <div className="space-y-3">
              <Label>Reminder Notifications</Label>
              <div className="flex flex-wrap gap-2">
                {reminderOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.reminderDays.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleReminder(option.value)}
                    className="transition-all"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select when you want to receive Telegram reminders
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="bg-background/50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link to="/dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1 gap-2" disabled={createSubscription.isPending}>
                {createSubscription.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Subscription
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
