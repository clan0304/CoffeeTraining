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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-blue-50 to-indigo-100 dark:from-indigo-950/20 dark:via-indigo-950/20 dark:to-blue-900/20">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-linear-to-r from-indigo-100/50 to-blue-100/50 dark:from-indigo-900/30 dark:to-blue-900/30"></div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center pt-20">
          {/* Main Heading */}
          <div className="mb-16">
            <h1 className="text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Master the Art of
              <span className="block bg-linear-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent">
                Coffee Cupping
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Train your palate with professional cupping techniques. Practice triangulation, 
              develop flavor profiles, and master the sensory skills of coffee professionals.
            </p>
          </div>

          {/* Training Modes Cards - Bento Grid Style */}
          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            <Link href="/cup-tasters" className="group">
              <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-white to-indigo-50/50 dark:from-neutral-900 dark:to-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 p-8 h-96 flex flex-col justify-between hover:border-indigo-500/80 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/10">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                {/* Content */}
                <div className="relative z-10 flex-1">
                  <div className="w-14 h-14 mb-6 bg-linear-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-700 transition-colors">
                    Cup Tasters
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-6">
                    Perfect your triangulation skills with this classic cupping exercise. 
                    Identify the odd cup among three samples and sharpen your sensory perception.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">Solo Practice</span>
                    <span className="px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">Team Challenges</span>
                    <span className="px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">Real-time Scoring</span>
                  </div>
                </div>

                {/* Button */}
                <div className="relative z-10">
                  <div className="w-full py-3 px-6 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                    Start Training
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/cupping" className="group">
              <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-white to-blue-50/50 dark:from-neutral-900 dark:to-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-8 h-96 flex flex-col justify-between hover:border-blue-500/80 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/10">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                {/* Content */}
                <div className="relative z-10 flex-1">
                  <div className="w-14 h-14 mb-6 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-700 transition-colors">
                    Cupping
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-6">
                    Master professional coffee evaluation using SCA protocols. 
                    Score fragrance, flavor, acidity, body, and more with standardized forms.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">SCA Standards</span>
                    <span className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">Score Analysis</span>
                    <span className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">Flavor Vocabulary</span>
                  </div>
                </div>

                {/* Button */}
                <div className="relative z-10">
                  <div className="w-full py-3 px-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                    Start Cupping
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="mt-20 mb-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-linear-to-br from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-700 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Real-time Training</h3>
              <p className="text-gray-600 dark:text-gray-300">Practice with live timer and instant feedback</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-linear-to-br from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-700 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Team Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-300">Train with friends and share results</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-linear-to-br from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-700 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">Monitor improvement and analyze performance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
