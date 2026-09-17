import type { Metadata } from 'next'
import './globals.css'
import ZodiacOracle from '@/components/ZodiacOracle'
import ThemeInjector from '@/components/ThemeInjector'
import Navbar from '@/components/layout/Navbar'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'ZODIAC ARENA — 12 Signs. One Destiny.',
  description: 'VALORANT Esports Tournament Platform powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeInjector />
        <Navbar />
        {children}
        <ZodiacOracle />
        <SpeedInsights />
      </body>
    </html>
  )
}
