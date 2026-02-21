import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlayerDashboard } from '@/actions/rooms'
import { getCuppingDashboard } from '@/actions/cupping'
import { DashboardTabs } from './dashboard-tabs'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth')

  const [cupTastersResult, cuppingResult] = await Promise.all([
    getPlayerDashboard(),
    getCuppingDashboard(),
  ])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="py-4 mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </header>

        <DashboardTabs
          cupTastersData={cupTastersResult.data ?? null}
          cuppingData={cuppingResult.data ?? null}
        />
      </div>
    </div>
  )
}
