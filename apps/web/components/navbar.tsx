'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

const HIDDEN_PATHS = ['/auth', '/onboarding', '/solo', '/rooms/', '/cupping/']

export function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  if (!isLoaded) return null
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null

  const links = [
    { href: '/cup-tasters', label: 'Cup Tasters' },
    { href: '/cupping', label: 'Cupping' },
    ...(isSignedIn ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ]

  return (
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
            <SignOutButton>
              <Button variant="ghost" size="sm">
                Sign Out
              </Button>
            </SignOutButton>
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
            <SignOutButton>
              <button className="w-full text-left text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                Sign Out
              </button>
            </SignOutButton>
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
  )
}
