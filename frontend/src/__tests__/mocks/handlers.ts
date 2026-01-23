import { http, HttpResponse } from 'msw'
import type { Subscription, UserProfile, SubscriptionStats, AdminStats, AdminUser } from '@/types'

// Mock data
export const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  telegramChatId: undefined,
  subscriptionLimit: 15,
  role: 'user',
  emailVerified: true,
  preferredCurrency: 'USD',
  newsletterEnabled: true,
}

export const mockAdminUser: UserProfile = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  telegramChatId: '123456789',
  subscriptionLimit: 100,
  role: 'admin',
  emailVerified: true,
  preferredCurrency: 'USD',
  newsletterEnabled: true,
}

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-1',
    userId: 'user-1',
    serviceName: 'Netflix',
    renewalDate: '2026-02-15',
    cost: '15.99',
    currency: 'USD',
    billingCycle: 'monthly',
    paymentMethod: 'Visa ending 1234',
    accountName: 'test@example.com',
    reminderDays: [7, 3, 1],
    notes: 'Premium plan',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sub-2',
    userId: 'user-1',
    serviceName: 'Spotify',
    renewalDate: '2026-01-20',
    cost: '9.99',
    currency: 'USD',
    billingCycle: 'monthly',
    paymentMethod: 'PayPal',
    accountName: 'user@spotify.com',
    reminderDays: [7, 1],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

export const mockStats: SubscriptionStats = {
  totalSubscriptions: 2,
  monthlyCost: {
    amount: 25.98,
    currency: 'USD',
  },
  yearlyCost: {
    amount: 311.76,
    currency: 'USD',
  },
  upcomingRenewalsCount: 2,
  upcomingRenewals: mockSubscriptions,
  costBreakdown: [
    { currency: 'USD', amount: 25.98, convertedToUSD: 25.98 },
  ],
  ratesUpdatedAt: '2026-01-10T02:00:00.000Z',
}

export const mockAdminStats: AdminStats = {
  users: {
    total: 100,
    active: 95,
    withTelegram: 50,
  },
  subscriptions: {
    total: 500,
    averagePerUser: 5,
  },
  notifications: {
    total: 1000,
    today: 25,
    failed: 5,
    successRate: '99.5',
  },
}

export const mockAdminUsers: AdminUser[] = [
  {
    ...mockUser,
    subscriptionCount: 2,
    telegramConnected: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    ...mockAdminUser,
    subscriptionCount: 10,
    telegramConnected: true,
    isActive: true,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

// Handlers
export const handlers = [
  // Auth handlers
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({
      session: { id: 'session-1', userId: 'user-1' },
      user: mockUser,
    })
  }),

  http.post('/api/auth/sign-in/email', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        session: { id: 'session-1', userId: 'user-1' },
        user: mockUser,
      })
    }
    return HttpResponse.json(
      { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/sign-up/email', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; password: string }
    return HttpResponse.json({
      session: { id: 'session-new', userId: 'user-new' },
      user: { ...mockUser, id: 'user-new', email: body.email, name: body.name },
    })
  }),

  http.post('/api/auth/sign-out', () => {
    return HttpResponse.json({ success: true })
  }),

  // User profile handlers
  http.get('/api/user/profile', () => {
    return HttpResponse.json({ data: mockUser })
  }),

  http.put('/api/user/profile', async ({ request }) => {
    const body = await request.json() as { name?: string }
    return HttpResponse.json({
      data: { ...mockUser, ...body },
    })
  }),

  http.post('/api/user/telegram/connect', () => {
    return HttpResponse.json({
      data: {
        code: 'ABC12345',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        botUsername: 'SubTrackBot',
        message: '/start ABC12345',
      },
    })
  }),

  http.delete('/api/user/telegram/disconnect', () => {
    return HttpResponse.json({ message: 'Telegram disconnected' })
  }),

  http.post('/api/user/telegram/test', () => {
    return HttpResponse.json({ message: 'Test notification sent' })
  }),

  // Subscription handlers
  http.get('/api/subscriptions', ({ request }) => {
    const url = new URL(request.url)
    const active = url.searchParams.get('active')

    let filtered = mockSubscriptions
    if (active === 'true') {
      filtered = mockSubscriptions.filter(s => s.isActive)
    } else if (active === 'false') {
      filtered = mockSubscriptions.filter(s => !s.isActive)
    }

    return HttpResponse.json({ data: filtered })
  }),

  http.get('/api/subscriptions/stats', () => {
    return HttpResponse.json({ data: mockStats })
  }),

  http.get('/api/subscriptions/:id', ({ params }) => {
    const sub = mockSubscriptions.find(s => s.id === params.id)
    if (!sub) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'Subscription not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({ data: sub })
  }),

  http.post('/api/subscriptions', async ({ request }) => {
    const body = await request.json() as Partial<Subscription>
    const newSub: Subscription = {
      id: 'sub-new',
      userId: 'user-1',
      serviceName: body.serviceName || '',
      renewalDate: body.renewalDate || '',
      cost: body.cost || '0',
      currency: body.currency || 'USD',
      billingCycle: body.billingCycle || 'monthly',
      paymentMethod: body.paymentMethod || '',
      accountName: body.accountName || '',
      reminderDays: body.reminderDays || [7, 3, 1],
      notes: body.notes,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json({ data: newSub }, { status: 201 })
  }),

  http.put('/api/subscriptions/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Subscription>
    const sub = mockSubscriptions.find(s => s.id === params.id)
    if (!sub) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'Subscription not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      data: { ...sub, ...body, updatedAt: new Date().toISOString() },
    })
  }),

  http.delete('/api/subscriptions/:id', ({ params }) => {
    const sub = mockSubscriptions.find(s => s.id === params.id)
    if (!sub) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'Subscription not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({ message: 'Subscription deleted' })
  }),

  // Admin handlers
  http.get('/api/admin/stats', () => {
    return HttpResponse.json({ data: mockAdminStats })
  }),

  http.get('/api/admin/users', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    return HttpResponse.json({
      data: mockAdminUsers,
      pagination: {
        page,
        limit,
        total: mockAdminUsers.length,
        totalPages: 1,
      },
    })
  }),

  http.get('/api/admin/users/:id', ({ params }) => {
    const user = mockAdminUsers.find(u => u.id === params.id)
    if (!user) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({ data: user })
  }),

  http.put('/api/admin/users/:id/limit', async ({ params, request }) => {
    const body = await request.json() as { subscriptionLimit: number }
    const user = mockAdminUsers.find(u => u.id === params.id)
    if (!user) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      data: { ...user, subscriptionLimit: body.subscriptionLimit },
    })
  }),

  http.put('/api/admin/users/:id/status', async ({ params, request }) => {
    const body = await request.json() as { isActive: boolean }
    const user = mockAdminUsers.find(u => u.id === params.id)
    if (!user) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      data: { ...user, isActive: body.isActive },
    })
  }),

  // Currency rates handler
  http.get('/api/currencies/rates', () => {
    return HttpResponse.json({
      data: {
        base: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73,
          IDR: 15000,
          AUD: 1.35,
          SGD: 1.32,
        },
        updatedAt: new Date().toISOString(),
      },
    })
  }),
]
