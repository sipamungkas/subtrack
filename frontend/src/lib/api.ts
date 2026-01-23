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
      // Redirect to dashboard - the banner will prompt verification
      if (!window.location.pathname.includes('/dashboard')) {
        window.location.href = '/dashboard'
      }
    }
    return Promise.reject(error)
  }
)
