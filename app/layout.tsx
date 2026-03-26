import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Groepenkast Adviseur | GrowGreen Energy',
  description: 'AI-gedreven groepenkast inspectie en advies tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header className="bg-green-700 text-white shadow-md">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-bold text-base leading-tight">GrowGreen Energy</div>
                <div className="text-green-200 text-xs">Groepenkast Adviseur</div>
              </div>
            </div>
            <a href="/" className="text-green-200 hover:text-white text-sm transition-colors">
              ← Overzicht
            </a>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
