import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-size-[64px_64px] opacity-30"></div>
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-7xl mx-auto text-center">
          
          {/* Main Heading with Glow Effect */}
          <div className="mb-16">
            <h1 className="text-7xl lg:text-8xl font-bold mb-8 leading-tight font-ubuntu">
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                Master the Art of
              </span>
              <br />
              <span className="relative inline-block">
                <span className="absolute inset-0 blur-2xl bg-linear-to-r from-blue-400 to-purple-400 opacity-30"></span>
                <span className="relative bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-extrabold">
                  Coffee Cupping
                </span>
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Train your palate with professional cupping techniques. Practice triangulation, 
              develop flavor profiles, and master the sensory skills of coffee professionals.
            </p>
          </div>

          {/* Glowing Cards */}
          <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto mb-20">
            
            {/* Cup Tasters Card */}
            <Link href="/cup-tasters" className="group">
              <div className="relative p-8 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/50">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                {/* Content */}
                <div className="relative z-10 h-80 flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 mb-6 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors font-ubuntu">
                      Cup Tasters
                    </h3>
                    
                    <p className="text-gray-300 text-lg leading-relaxed mb-6">
                      Perfect your triangulation skills with this classic cupping exercise. 
                      Identify the odd cup among three samples and sharpen your sensory perception.
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">Solo Practice</span>
                      <span className="px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">Team Challenges</span>
                      <span className="px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">Real-time Scoring</span>
                    </div>
                  </div>

                  {/* Glowing Button */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold py-4 px-8 rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                      Start Training
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Cupping Card */}
            <Link href="/cupping" className="group">
              <div className="relative p-8 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/50">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                {/* Content */}
                <div className="relative z-10 h-80 flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 mb-6 bg-linear-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors font-ubuntu">
                      Cupping
                    </h3>
                    
                    <p className="text-gray-300 text-lg leading-relaxed mb-6">
                      Master professional coffee evaluation using SCA protocols. 
                      Score fragrance, flavor, acidity, body, and more with standardized forms.
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-4 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">SCA Standards</span>
                      <span className="px-4 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">Score Analysis</span>
                      <span className="px-4 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">Flavor Vocabulary</span>
                    </div>
                  </div>

                  {/* Glowing Button */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-r from-purple-500 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative bg-linear-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 text-white font-semibold py-4 px-8 rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                      Start Cupping
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature Highlights with Glow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="group text-center p-6 rounded-2xl bg-linear-to-b from-gray-800/30 to-gray-900/30 border border-gray-700/30 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors font-ubuntu">Real-time Training</h3>
              <p className="text-gray-300">Practice with live timer and instant feedback</p>
            </div>
            
            <div className="group text-center p-6 rounded-2xl bg-linear-to-b from-gray-800/30 to-gray-900/30 border border-gray-700/30 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors font-ubuntu">Team Collaboration</h3>
              <p className="text-gray-300">Train with friends and share results</p>
            </div>
            
            <div className="group text-center p-6 rounded-2xl bg-linear-to-b from-gray-800/30 to-gray-900/30 border border-gray-700/30 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors font-ubuntu">Progress Tracking</h3>
              <p className="text-gray-300">Monitor improvement and analyze performance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
