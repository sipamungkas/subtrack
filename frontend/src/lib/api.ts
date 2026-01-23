import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login'
      }
    } else if (error.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
      // Trigger a UI update to show verification blocker
      // The existing EmailVerificationBlocker handles this via auth context
      window.dispatchEvent(new CustomEvent('email-not-verified'))
    }
    return Promise.reject(error)
  }
)
