import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { InvitationsList } from '@/components/rooms/invitations-list'
import type { UserProfile, Room, RoomInvitation, PublicProfile } from '@/types/database'

export default async function HomePage() {
  const { userId } = await auth()

  // Unauthenticated view
  if (!userId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-12">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Cupping Training</h1>
            <p className="text-muted-foreground">
              Train your palate with triangulation tests
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <Link href="/solo">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle>Solo Practice</CardTitle>
                  <CardDescription>
                    Practice on your own with timer and answer sheets. No account needed.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/auth">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle>Create or Join Room</CardTitle>
                  <CardDescription>
                    Sign in to create training rooms, track scores, and train with others.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-8">
            <p>For professional coffee cuppers and enthusiasts</p>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated view - check onboarding status from Supabase
  const supabase = createAdminSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('clerk_id', userId)
    .single<UserProfile>()

  // Redirect to onboarding if not completed
  if (!profile?.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between py-4 mb-8">
          <h1 className="text-2xl font-bold">Cupping Training</h1>
          <SignOutButton>
            <Button variant="outline" size="sm">
              Sign Out
            </Button>
          </SignOutButton>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              Ready to train your palate?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={profile?.photo_url || undefined}
                  alt={profile?.username || 'User'}
                />
                <AvatarFallback className="text-xl">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">
                  @{profile?.username || 'User'}
                </p>
                <p className="text-muted-foreground">
                  {profile?.email}
                </p>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/solo">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Solo Practice</CardTitle>
                <CardDescription>
                  Quick practice with timer and answer sheet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Start</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rooms/create">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Create Room</CardTitle>
                <CardDescription>
                  Host a training session for your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Create</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rooms/join">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Join Room</CardTitle>
                <CardDescription>
                  Enter a room code to join a session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">Join</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending Invitations */}
        <InvitationsList />

        {/* Your Rooms Section - TODO: Add room list component */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your History</CardTitle>
              <CardDescription>
                View your past training sessions and scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No training sessions yet. Start practicing!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
