'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        <CardContent>
          <Tabs defaultValue="sign-in" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in" className="flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none p-0 w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 'w-full',
                    formButtonPrimary: 'w-full bg-primary hover:bg-primary/90',
                    footerAction: 'hidden',
                  },
                }}
                routing="hash"
              />
            </TabsContent>
            <TabsContent value="sign-up" className="flex justify-center">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none p-0 w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 'w-full',
                    formButtonPrimary: 'w-full bg-primary hover:bg-primary/90',
                    footerAction: 'hidden',
                  },
                }}
                routing="hash"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
