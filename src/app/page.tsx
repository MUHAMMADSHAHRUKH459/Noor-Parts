'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  totalInventoryValue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalInventoryValue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadStats = async () => {
      try {
        const [
          { count: totalProducts },
          { count: totalSales },
          { data: salesData },
          { data: productsData },
        ] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('sales').select('*', { count: 'exact', head: true }),
          supabase.from('sales').select('total_amount'),
          supabase.from('products').select('purchase_price, quantity'),
        ])
        if (!isMounted) return
        const totalRevenue = salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
        const totalInventoryValue = productsData?.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0) || 0
        setStats({ totalProducts: totalProducts || 0, totalSales: totalSales || 0, totalRevenue, totalInventoryValue })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadStats()
    return () => { isMounted = false }
  }, [])

  const cards = [
    { label: 'Total Products', value: stats.totalProducts, format: 'number', accent: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)', icon: '◫' },
    { label: 'Total Sales', value: stats.totalSales, format: 'number', accent: 'var(--accent-green)', dim: 'var(--accent-green-dim)', icon: '◈' },
    { label: 'Total Revenue', value: stats.totalRevenue, format: 'currency', accent: 'var(--accent-yellow)', dim: 'var(--accent-yellow-dim)', icon: '◉' },
    { label: 'Inventory Value', value: stats.totalInventoryValue, format: 'currency', accent: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)', icon: '▣' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--accent-green)' }}>◎</div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Overview</p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Dashboard</h1>
      </div>

      {/* Stats Cards — 2 cols on mobile, 4 on desktop */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {cards.map((card) => (
          <div key={card.label} style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px', color: card.accent }}>{card.icon}</span>
              <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: card.accent, backgroundColor: card.dim, padding: '3px 8px', borderRadius: '4px', letterSpacing: '1px' }}>LIVE</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{card.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {card.format === 'currency' ? `Rs.${card.value.toLocaleString()}` : card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Grid — stacks on mobile */}
      <div className="bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* System Info */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>System</p>
          {['Inventory Management', 'Sales Tracking', 'Analytics', 'Zakat Calculator', 'Voice Entry'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ color: 'var(--accent-green)', fontSize: '12px' }}>✓</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Zakat */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>Zakat Status</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Maal</p>
          <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
            Rs.{stats.totalInventoryValue.toLocaleString()}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Zakat (2.5%)</p>
          <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>
            Rs.{(stats.totalInventoryValue * 0.025).toLocaleString()}
          </p>
        </div>

        {/* Quick Links */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>Quick Links</p>
          {[
            { href: '/inventory', label: 'Inventory add karo' },
            { href: '/sales', label: 'Sale record karo' },
            { href: '/analytics', label: 'Analytics dekho' },
            { href: '/zakat', label: 'Zakat calculate karo' },
          ].map(link => (
            <a key={link.href} href={link.href} style={{ display: 'block', color: 'var(--accent-green)', fontSize: '13px', textDecoration: 'none', marginBottom: '10px', opacity: 0.8 }}>
              → {link.label}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}