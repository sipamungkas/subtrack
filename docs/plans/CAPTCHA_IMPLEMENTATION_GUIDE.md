# Cloudflare Turnstile CAPTCHA - Implementation Guide

Step-by-step implementation with code examples.

---

## Phase 1: Backend Configuration

### Step 1.1: Update Auth Configuration

**File:** `backend/src/lib/auth.ts`

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  plugins: [
    // Cloudflare Turnstile CAPTCHA protection
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      // Optional: customize protected endpoints (these are defaults)
      // endpoints: ["/sign-in/email", "/sign-up/email"],
    }),
  ],
  logger: {
    level: isProduction ? "error" : "debug",
  },
});

export type Auth = typeof auth;
```

### Step 1.2: Update Environment Files

**File:** `backend/.env`

```bash
# ... existing variables ...

# Cloudflare Turnstile (CAPTCHA)
# Get keys from: https://dash.cloudflare.com/ -> Turnstile
TURNSTILE_SECRET_KEY=your-turnstile-secret-key-here
```

**File:** `backend/.env.example`

```bash
# ... existing variables ...

# Cloudflare Turnstile (CAPTCHA)
# Get keys from: https://dash.cloudflare.com/ -> Turnstile
# For development, use test keys:
# Always Pass: 1x0000000000000000000000000000000AA
# Always Fail: 2x0000000000000000000000000000000AB
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

---

## Phase 2: Frontend Configuration

### Step 2.1: Install Turnstile Package

```bash
cd frontend
npm install @marsidev/react-turnstile
```

### Step 2.2: Create Turnstile Component

**File:** `frontend/src/components/ui/turnstile.tsx`

```tsx
import { Turnstile as CloudflareTurnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useRef, useCallback } from 'react'

interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

export function Turnstile({ onVerify, onError, onExpire, className }: TurnstileProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  const handleError = useCallback(() => {
    onError?.()
  }, [onError])

  const handleExpire = useCallback(() => {
    onExpire?.()
    // Reset the widget to allow retry
    turnstileRef.current?.reset()
  }, [onExpire])

  if (!siteKey) {
    console.warn('VITE_TURNSTILE_SITE_KEY not configured')
    return null
  }

  return (
    <div className={className}>
      <CloudflareTurnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={handleError}
        onExpire={handleExpire}
        options={{
          theme: 'auto', // Matches system theme
          size: 'flexible', // Responsive width
        }}
      />
    </div>
  )
}

// Hook version for more control
export function useTurnstile() {
  const turnstileRef = useRef<TurnstileInstance>(null)

  const reset = useCallback(() => {
    turnstileRef.current?.reset()
  }, [])

  const getToken = useCallback(() => {
    return turnstileRef.current?.getResponse()
  }, [])

  return {
    ref: turnstileRef,
    reset,
    getToken,
  }
}
```

### Step 2.3: Update Auth Context

**File:** `frontend/src/lib/auth.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { UserProfile } from '@/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>
  signUp: (name: string, email: string, password: string, captchaToken?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/user/profile')
      setUser(response.data.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/auth/get-session')
        if (response.data?.session) {
          await refreshUser()
        }
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [refreshUser])

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const headers: Record<string, string> = {}

    // Add CAPTCHA token if provided
    if (captchaToken) {
      headers['x-captcha-response'] = captchaToken
    }

    const response = await api.post('/api/auth/sign-in/email', {
      email,
      password,
    }, { headers })

    if (response.data) {
      await refreshUser()
    }
  }

  const signUp = async (name: string, email: string, password: string, captchaToken?: string) => {
    const headers: Record<string, string> = {}

    // Add CAPTCHA token if provided
    if (captchaToken) {
      headers['x-captcha-response'] = captchaToken
    }

    const response = await api.post('/api/auth/sign-up/email', {
      name,
      email,
      password,
    }, { headers })

    if (response.data) {
      await refreshUser()
    }
  }

  const signOut = async () => {
    try {
      await api.post('/api/auth/sign-out')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Step 2.4: Update Login Page

**File:** `frontend/src/pages/LoginPage.tsx`

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Turnstile } from '@/components/ui/turnstile'
import { toast } from '@/hooks/use-toast'
import { CreditCard, ArrowRight, Loader2 } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
  }

  const handleCaptchaError = () => {
    setCaptchaToken(null)
    toast({
      title: 'CAPTCHA Error',
      description: 'Failed to verify CAPTCHA. Please refresh and try again.',
      variant: 'destructive',
    })
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate CAPTCHA token
    if (!captchaToken) {
      toast({
        title: 'Verification Required',
        description: 'Please complete the security check',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      await signIn(email, password, captchaToken)
      toast({ title: 'Welcome back!', description: 'Signed in successfully' })
      navigate('/dashboard')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to sign in',
        variant: 'destructive',
      })
      // Reset captcha on error so user can retry
      setCaptchaToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your SubTrack account</p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-background/50"
                />
              </div>

              {/* Turnstile CAPTCHA */}
              <Turnstile
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={handleCaptchaExpire}
                className="flex justify-center"
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !captchaToken}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
```

### Step 2.5: Update Register Page

**File:** `frontend/src/pages/RegisterPage.tsx`

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Turnstile } from '@/components/ui/turnstile'
import { toast } from '@/hooks/use-toast'
import { CreditCard, ArrowRight, Loader2, Check } from 'lucide-react'

const features = [
  'Track unlimited subscriptions',
  'Telegram reminders',
  'Payment method tracking',
  'Free forever',
]

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
  }

  const handleCaptchaError = () => {
    setCaptchaToken(null)
    toast({
      title: 'CAPTCHA Error',
      description: 'Failed to verify CAPTCHA. Please refresh and try again.',
      variant: 'destructive',
    })
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate CAPTCHA token
    if (!captchaToken) {
      toast({
        title: 'Verification Required',
        description: 'Please complete the security check',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      await signUp(name, email, password, captchaToken)
      toast({ title: 'Welcome!', description: 'Account created successfully' })
      navigate('/dashboard')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      })
      // Reset captcha on error so user can retry
      setCaptchaToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          <p className="text-muted-foreground">Start tracking your subscriptions today</p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>Enter your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Features list */}
              <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Turnstile CAPTCHA */}
              <Turnstile
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={handleCaptchaExpire}
                className="flex justify-center"
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !captchaToken}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
```

### Step 2.6: Update Frontend Environment Files

**File:** `frontend/.env`

```bash
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=SubTrackBot

# Cloudflare Turnstile (CAPTCHA)
# Get keys from: https://dash.cloudflare.com/ -> Turnstile
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key-here
```

**File:** `frontend/.env.example`

```bash
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=SubTrackBot

# Cloudflare Turnstile (CAPTCHA)
# Get keys from: https://dash.cloudflare.com/ -> Turnstile
# For development, use test keys:
# Always Pass: 1x00000000000000000000AA
# Always Fail: 2x00000000000000000000AB
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

---

## Phase 3: Testing

### Development Test Keys

For local development, use these Cloudflare test keys:

**Backend `.env`:**
```bash
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

**Frontend `.env`:**
```bash
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

### Test Scenarios

#### 1. Successful Login with CAPTCHA
```bash
# Start both servers
cd backend && bun run dev
cd frontend && npm run dev

# Visit http://localhost:5173/login
# Fill in credentials
# Complete Turnstile (auto-passes with test keys)
# Click Sign In
# Expected: Successful login and redirect to dashboard
```

#### 2. Login Without CAPTCHA (Should Fail)
```typescript
// In browser console
fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'test@test.com', password: 'password' })
})
// Expected: 400 error - Missing captcha token
```

#### 3. Login With Invalid CAPTCHA (Should Fail)
```typescript
// In browser console
fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-captcha-response': 'invalid-token'
  },
  credentials: 'include',
  body: JSON.stringify({ email: 'test@test.com', password: 'password' })
})
// Expected: 401/403 error - Invalid captcha
```

---

## Verification Checklist

After implementation, verify:

- [ ] Backend starts without errors
- [ ] Frontend builds without TypeScript errors
- [ ] Turnstile widget appears on Login page
- [ ] Turnstile widget appears on Register page
- [ ] Login works with valid CAPTCHA
- [ ] Register works with valid CAPTCHA
- [ ] Submit button is disabled until CAPTCHA completed
- [ ] Error message shown if CAPTCHA validation fails
- [ ] CAPTCHA resets after failed login attempt
- [ ] Widget adapts to dark/light theme

---

## Troubleshooting

### Turnstile Widget Not Showing
1. Check `VITE_TURNSTILE_SITE_KEY` is set correctly
2. Check browser console for errors
3. Verify domain is whitelisted in Cloudflare dashboard

### "Invalid Captcha" Errors
1. Verify `TURNSTILE_SECRET_KEY` matches Cloudflare dashboard
2. Check network tab for the verify request
3. Ensure token is being sent in `x-captcha-response` header

### Widget Shows But Doesn't Validate
1. Ensure both site key and secret key are from the same Turnstile widget
2. Check if using test keys consistently (site key + secret key pair)
3. Verify the domain in Cloudflare settings
