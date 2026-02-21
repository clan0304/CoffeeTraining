import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/auth')
  }

  return <OnboardingForm />
}
