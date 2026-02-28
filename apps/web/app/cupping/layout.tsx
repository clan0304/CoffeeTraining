import { FlavorWordsProvider } from '@/components/cupping/flavor-words-provider'

export default function CuppingLayout({ children }: { children: React.ReactNode }) {
  return <FlavorWordsProvider>{children}</FlavorWordsProvider>
}
