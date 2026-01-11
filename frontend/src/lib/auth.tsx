import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { queryClient } from './query-client'
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
      queryClient.clear()
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
