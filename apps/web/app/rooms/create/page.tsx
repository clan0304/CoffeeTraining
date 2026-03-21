'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom } from '@/actions/rooms'

export default function CreateRoomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [timerMinutes, setTimerMinutes] = useState(8)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await createRoom({
      name: name.trim() || null,
      timerMinutes,
    })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if (result.room) {
      router.push(`/rooms/${result.room.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-size-[64px_64px] opacity-30"></div>
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-3/4 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 min-h-screen p-4 pt-20">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold font-ubuntu">
              <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Create Room
              </span>
            </h1>
            <p className="text-xl text-gray-200 max-w-md mx-auto leading-relaxed">
              Set up a training room for your team
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative p-8 rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50 backdrop-blur-sm">
              {/* Glowing Border Effect */}
              <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-50 blur-xl"></div>
              
              {/* Inner Container */}
              <div className="relative z-10 space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2 font-ubuntu">Room Settings</h2>
                  <p className="text-gray-300 text-lg">
                    Configure your training session
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-white text-lg font-medium">
                      Room Name (Optional)
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Morning Training"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      className="bg-gray-800/70 border-gray-600/50 text-white placeholder-gray-400 text-lg h-12 focus:border-blue-500/70 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white text-lg font-medium">Timer Duration</Label>
                      <p className="text-sm text-gray-300 mt-1">
                        Standard cupping time is 8 minutes
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center pt-2">
                      {[5, 8, 10, 12].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          onClick={() => setTimerMinutes(mins)}
                          className={`w-16 h-12 text-lg font-semibold rounded-xl transition-all duration-300 ${
                            timerMinutes === mins
                              ? 'bg-linear-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110'
                              : 'bg-gray-700/50 border border-gray-600/50 text-gray-200 hover:bg-gray-600/50 hover:border-blue-500/50'
                          }`}
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50">
                      <p className="text-red-100 text-center font-medium">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-semibold bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </Button>

              <div className="text-center">
                <Link 
                  href="/cup-tasters" 
                  className="text-gray-300 hover:text-white text-lg underline-offset-4 hover:underline transition-colors duration-200"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
