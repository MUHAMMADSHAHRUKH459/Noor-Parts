'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sale, Product } from '@/types'

interface DailySale { date: string; total: number; count: number }
interface TopProduct { name: string; brand: string; total_sold: number; total_revenue: number }

export default function Analytics() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [{ data: salesData }, { data: productsData }] = await Promise.all([
          supabase.from('sales').select('*, product:products(*)').order('sold_at', { ascending: false }),
          supabase.from('products').select('*'),
        ])
        if (!isMounted) return
        const salesList = salesData || []
        const productsList = productsData || []
        setSales(salesList)
        setProducts(productsList)

        const dailyMap: Record<string, DailySale> = {}
        salesList.forEach(sale => {
          const date = new Date(sale.sold_at).toLocaleDateString('en-PK')
          if (!dailyMap[date]) dailyMap[date] = { date, total: 0, count: 0 }
          dailyMap[date].total += sale.total_amount || 0
          dailyMap[date].count += 1
        })
        setDailySales(Object.values(dailyMap).slice(0, 7))

        const productMap: Record<string, TopProduct> = {}
        salesList.forEach(sale => {
          const name = sale.product?.name || 'Unknown'
          const brand = sale.product?.brand || ''
          if (!productMap[name]) productMap[name] = { name, brand, total_sold: 0, total_revenue: 0 }
          productMap[name].total_sold += sale.quantity || 0
          productMap[name].total_revenue += sale.total_amount || 0
        })
        setTopProducts(Object.values(productMap).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5))
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0)
  const totalCost = sales.reduce((sum, s) => sum + ((s.product?.purchase_price || 0) * (s.quantity || 0)), 0)
  const totalProfit = totalRevenue - totalCost
  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= 5)
  const outOfStock = products.filter(p => p.quantity === 0)

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
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Insights</p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Analytics</h1>
      </div>

      {/* Stats — 2 cols mobile, 4 desktop */}
      <div className="analytics-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Total Revenue', value: `Rs.${totalRevenue.toLocaleString()}`, accent: 'var(--accent-green)' },
          { label: 'Total Profit', value: `Rs.${totalProfit.toLocaleString()}`, accent: totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
          { label: 'Inventory Value', value: `Rs.${totalInventoryValue.toLocaleString()}`, accent: 'var(--accent-blue)' },
          { label: 'Total Sales', value: sales.length.toString(), accent: 'var(--accent-yellow)' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '8px' }}>{card.label}</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: card.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts — stacks on mobile */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Daily Sales */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '20px' }}>Daily Sales</p>
          {dailySales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Koi data nahi</p>
          ) : dailySales.map(day => {
            const maxTotal = Math.max(...dailySales.map(d => d.total))
            const width = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0
            return (
              <div key={day.date} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>{day.date}</span>
                  <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{day.total.toLocaleString()}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${width}%`, backgroundColor: 'var(--accent-green)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top Products */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '20px' }}>Top Products</p>
          {topProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Koi data nahi</p>
          ) : topProducts.map((product, i) => (
            <div key={product.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', paddingBottom: '14px', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: '26px', height: '26px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '700', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{product.total_sold} pcs sold</p>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '600', flexShrink: 0 }}>Rs.{product.total_revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Alerts — stacks on mobile */}
      <div className="alerts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-yellow)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-yellow)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>⚠ Low Stock ({lowStockProducts.length})</p>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sab theek hai ✓</p>
          ) : lowStockProducts.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{p.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{p.quantity} pcs</span>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-red)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-red)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>✕ Out of Stock ({outOfStock.length})</p>
          {outOfStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sab available hai ✓</p>
          ) : outOfStock.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{p.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>0 pcs</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .analytics-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .charts-grid { grid-template-columns: 1fr !important; }
          .alerts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}