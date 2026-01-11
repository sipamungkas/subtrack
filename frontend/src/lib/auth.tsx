import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { queryClient } from './query-client'
import type { UserProfile, OTPResendStatus } from '@/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isEmailVerified: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>
  signUp: (name: string, email: string, password: string, captchaToken?: string) => Promise<{ email: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  sendVerificationOTP: (email: string) => Promise<void>
  verifyEmail: (email: string, otp: string) => Promise<void>
  checkResendStatus: (email: string) => Promise<OTPResendStatus>
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
    if (captchaToken) {
      headers['x-captcha-response'] = captchaToken
    }

    await api.post('/api/auth/sign-up/email', {
      name,
      email,
      password,
    }, { headers })

    // Don't refresh user - redirect to verify email page instead
    return { email }
  }

  const signOut = async () => {
    try {
      await api.post('/api/auth/sign-out')
    } finally {
      setUser(null)
      queryClient.clear()
    }
  }

  const sendVerificationOTP = async (email: string) => {
    await api.post('/api/auth/email-otp/send-verification-otp', {
      email,
      type: 'email-verification',
    })
    // Record the resend attempt for rate limiting
    await api.post('/api/auth/otp-resend-record', { email })
  }

  const verifyEmail = async (email: string, otp: string) => {
    await api.post('/api/auth/email-otp/verify-email', {
      email,
      otp,
    })
    await refreshUser()
  }

  const checkResendStatus = async (email: string): Promise<OTPResendStatus> => {
    const response = await api.get(`/api/auth/otp-resend-status?email=${encodeURIComponent(email)}`)
    return response.data
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isEmailVerified: user?.emailVerified ?? false,
        signIn,
        signUp,
        signOut,
        refreshUser,
        sendVerificationOTP,
        verifyEmail,
        checkResendStatus,
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
