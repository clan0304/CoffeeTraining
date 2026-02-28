'use client'

import { SignIn } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Cupping Training</CardTitle>
          <CardDescription>
            Sign in to start training your palate
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center [&_.cl-footer]:hidden">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none p-0 w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'w-full',
                formButtonPrimary: 'w-full bg-primary hover:bg-primary/90',
                footer: '!hidden',
              },
            }}
            routing="hash"
          />
        </CardContent>
      </Card>
    </div>
  )
}
