import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  CreditCard
} from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">SubTrack</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link to="/profile" className={navLinkClass('/profile')}>
                <User className="h-4 w-4" />
                Profile
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {user?.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2 animate-fade-in">
            <Link
              to="/dashboard"
              className={navLinkClass('/dashboard')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={navLinkClass('/profile')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className={navLinkClass('/admin/dashboard')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
