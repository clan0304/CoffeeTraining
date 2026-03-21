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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-size-[64px_64px] opacity-30"></div>
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-emerald-900/20 via-transparent to-transparent"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-3/4 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 min-h-screen p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <header className="py-4 mb-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 font-ubuntu">
              <span className="bg-linear-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Track your progress and review your cupping performance
            </p>
          </header>

          <div className="relative z-10">
            <DashboardTabs
              cupTastersData={cupTastersResult.data ?? null}
              cuppingData={cuppingResult.data ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
