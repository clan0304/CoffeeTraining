'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

const HIDDEN_PATHS = ['/auth', '/onboarding', '/solo', '/rooms/', '/cupping/']

export function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const pathname = usePathname()

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
        <div className="flex items-center gap-1">
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
      </div>
    </nav>
  )
}
