'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { PersonIcon, DashboardIcon, ExitIcon } from '@radix-ui/react-icons'

interface ConfirmSignOutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

function ConfirmSignOutModal({ isOpen, onClose, onConfirm }: ConfirmSignOutModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-background border rounded-lg p-6 max-w-sm mx-4">
        <h3 className="text-lg font-semibold mb-2">Sign Out</h3>
        <p className="text-muted-foreground mb-4">
          Are you sure you want to sign out?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <SignOutButton>
            <Button variant="destructive" size="sm" onClick={onConfirm}>
              Sign Out
            </Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}

const HIDDEN_PATHS = ['/auth', '/onboarding', '/solo', '/rooms/', '/cupping/']

export function Navbar() {
  const { isSignedIn, isLoaded, user } = useUser()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setProfileMenuOpen(false)
  }, [pathname])

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isLoaded) return null
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null

  const links = [
    { href: '/cup-tasters', label: 'Cup Tasters' },
    { href: '/cupping', label: 'Cupping' },
    ...(isSignedIn
      ? [
          { href: '/friends', label: 'Friends' },
        ]
      : []),
  ]

  return (
    <>
      <ConfirmSignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={() => setShowSignOutModal(false)}
      />
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="font-bold text-lg">
          Cupping Training
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-2 rounded-md transition-colors ${
                pathname === link.href
                  ? 'bg-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Profile menu"
              >
                {user?.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt="Profile" 
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <PersonIcon className="w-5 h-5" />
                )}
              </button>
              
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background border rounded-md shadow-lg z-50">
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm truncate">{user?.username || user?.firstName || 'User'}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <DashboardIcon className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button 
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        setShowSignOutModal(true)
                      }}
                    >
                      <ExitIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <SignInButton>
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          className="sm:hidden p-2 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t px-4 py-2 space-y-1 bg-background">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-sm px-3 py-2 rounded-md transition-colors ${
                pathname === link.href
                  ? 'bg-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <>
              <div className="px-3 py-2 border-t border-b">
                <p className="font-medium text-sm truncate">{user?.username || user?.firstName || 'User'}</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <DashboardIcon className="w-4 h-4" />
                Dashboard
              </Link>
              <button 
                className="flex items-center gap-2 w-full text-left text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  setShowSignOutModal(true)
                }}
              >
                <ExitIcon className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <SignInButton>
              <button className="w-full text-left text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      )}
      </nav>
    </>
  )
}
