import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import ThemeInjector from '@/components/ThemeInjector'
import ChromeGate from '@/components/layout/ChromeGate'

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
        <ChromeGate />
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
