import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CuppingPage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-size-[64px_64px] opacity-30"></div>
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-3/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 right-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 min-h-screen p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <header className="py-4 mb-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 font-ubuntu">
              <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Cupping
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Evaluate and score coffees using professional cupping protocols
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/cupping/solo" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/50 h-52 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors font-ubuntu">Solo Practice</h3>
                  <p className="text-gray-300 text-sm">Practice cupping on your own. No account needed.</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                    Start
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/cupping/create" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/50 h-52 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors font-ubuntu">Create Room</h3>
                  <p className="text-gray-300 text-sm">Host a cupping session for your team</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                    Create
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/cupping/join" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-indigo-500/50 h-52 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors font-ubuntu">Join Room</h3>
                  <p className="text-gray-300 text-sm">Enter a room code to join a session</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                    Join
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {userId && (
            <div className="relative z-10 mt-8">
              <Link href="/dashboard" className="group block">
                <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.01] hover:border-emerald-500/50">
                  {/* Glowing Border Effect */}
                  <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-emerald-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                  
                  {/* Inner Glow */}
                  <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors font-ubuntu">Your Sessions</h3>
                    <p className="text-gray-300 text-sm mb-4">View your cupping history, scores, and session details</p>
                    
                    <div className="w-full py-2 px-4 bg-linear-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105 max-w-xs">
                      View Dashboard
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
