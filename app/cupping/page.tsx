import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CuppingPage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="py-4 mb-8">
          <h1 className="text-2xl font-bold">Cupping</h1>
          <p className="text-muted-foreground">
            Evaluate and score coffees
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/cupping/solo">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Solo Practice</CardTitle>
                <CardDescription>
                  Practice cupping on your own. No account needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Start</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cupping/create">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Create Room</CardTitle>
                <CardDescription>
                  Host a cupping session for your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Create</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cupping/join">
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

        {userId && (
          <div className="mt-6">
            <Link href="/dashboard">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">Your Sessions</CardTitle>
                  <CardDescription>
                    View your cupping history, scores, and session details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">View Dashboard</Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
