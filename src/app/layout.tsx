import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/ui/Sidebar'

export const metadata: Metadata = {
  title: 'Noor Parts',
  description: 'Mobile Parts Shop Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <Sidebar />
          <main
            className="main-content"
            style={{ flex: 1, padding: '32px', overflowY: 'auto', minHeight: '100vh' }}
          >
            {children}
          </main>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .main-content {
              padding: 80px 16px 24px 16px !important;
            }
          }
        `}</style>
      </body>
    </html>
  )
}