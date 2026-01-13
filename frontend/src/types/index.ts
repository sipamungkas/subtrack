export interface Subscription {
  id: string
  userId: string
  serviceName: string
  renewalDate: string
  cost: string
  currency: string
  billingCycle: 'monthly' | 'yearly' | 'quarterly' | 'custom'
  customIntervalDays?: number | null
  paymentMethod: string
  accountName: string
  reminderDays: number[]
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CostBreakdown {
  currency: string
  amount: number
  convertedToUSD: number
}

export interface SubscriptionStats {
  totalSubscriptions: number
  monthlyCost: {
    amount: number
    currency: string
  }
  yearlyCost: {
    amount: number
    currency: string
  }
  upcomingRenewalsCount: number
  upcomingRenewals: Subscription[]
  costBreakdown: CostBreakdown[]
  ratesUpdatedAt: string | null
}

export interface User {
  id: string
  email: string
  name?: string
  telegramChatId?: string
  subscriptionLimit: number
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  telegramChatId?: string
  subscriptionLimit: number
  role: 'user' | 'admin'
  emailVerified: boolean
  preferredCurrency: 'USD' | 'EUR' | 'GBP' | 'IDR' | 'AUD' | 'SGD'
}

export interface OTPResendStatus {
  allowed: boolean
  waitSeconds?: number
  attemptsLeft?: number
}

export interface TelegramConnectResponse {
  code: string
  expiresAt: string
  botUsername: string
  message: string
}

export interface AdminStats {
  users: {
    total: number
    active: number
    withTelegram: number
  }
  subscriptions: {
    total: number
    averagePerUser: number
  }
  notifications: {
    total: number
    today: number
    failed: number
    successRate: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AdminUser extends User {
  subscriptionCount: number
  telegramConnected: boolean
}

export interface CreateSubscriptionInput {
  serviceName: string
  renewalDate: string
  cost: string
  currency?: string
  billingCycle?: 'monthly' | 'yearly' | 'quarterly' | 'custom'
  customIntervalDays?: number
  paymentMethod: string
  accountName: string
  reminderDays?: number[]
  notes?: string
}

export interface UpdateSubscriptionInput extends Partial<CreateSubscriptionInput> {}
