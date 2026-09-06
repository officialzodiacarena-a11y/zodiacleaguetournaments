import type { Metadata } from 'next'
import './globals.css'
import ZodiacOracle from '@/components/ZodiacOracle'

export const metadata: Metadata = {
  title: 'ZODIAC ARENA – 12 Signs. One Destiny.',
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
        {children}
        <ZodiacOracle />
      </body>
    </html>
  )
}
