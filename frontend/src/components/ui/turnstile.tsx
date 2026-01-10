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
