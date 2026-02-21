import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@cuppingtraining/shared/types'

export default async function HomePage() {
  const { userId } = await auth()

  // If authenticated, check onboarding
  if (userId) {
    const supabase = createAdminSupabaseClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single<UserProfile>()

    if (!profile?.onboarding_completed) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="py-4 mb-8">
          <h1 className="text-2xl font-bold">Choose a Game</h1>
          <p className="text-muted-foreground">
            Select a training mode to get started
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/cup-tasters">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Cup Tasters</CardTitle>
                <CardDescription>
                  Triangulation training for coffee cupping. Practice solo or with your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Play</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cupping">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Cupping</CardTitle>
                <CardDescription>
                  Evaluate and score coffees using the SCA cupping form. Solo or with your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Play</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
