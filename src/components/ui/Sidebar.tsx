'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '▣' },
  { href: '/inventory', label: 'Inventory', icon: '◫' },
  { href: '/sales', label: 'Sales', icon: '◈' },
  { href: '/search', label: 'Search', icon: '⌕' },
  { href: '/analytics', label: 'Analytics', icon: '◉' },
  { href: '/zakat', label: 'Zakat', icon: '◎' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <div style={{
        width: '220px',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }} className="desktop-sidebar">
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>System</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-green)', letterSpacing: '-0.5px' }}>Noor Parts</h1>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 12px', borderRadius: '8px', marginBottom: '4px',
                textDecoration: 'none',
                backgroundColor: isActive ? 'var(--accent-green-dim)' : 'transparent',
                color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s ease',
                border: isActive ? '1px solid #00d08430' : '1px solid transparent',
              }}>
                <span style={{ fontSize: '16px', opacity: 0.8 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>v1.0.0 — NP</p>
        </div>
      </div>

      {/* ── Mobile Top Navbar ── */}
      <div className="mobile-navbar" style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green)' }}>Noor Parts</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)', fontSize: '20px', padding: '8px',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <div className="mobile-menu" style={{
          display: 'none',
          position: 'fixed',
          top: '56px', left: 0, right: 0,
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          zIndex: 99,
          padding: '8px 12px 16px',
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 12px', borderRadius: '8px', marginBottom: '4px',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'var(--accent-green-dim)' : 'transparent',
                  color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '15px',
                  border: isActive ? '1px solid #00d08430' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-navbar { display: flex !important; }
          .mobile-menu { display: block !important; }
        }
      `}</style>
    </>
  )
}