'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sale, Product } from '@/types'

interface DailySale {
  date: string
  total: number
  count: number
}

interface TopProduct {
  name: string
  brand: string
  total_sold: number
  total_revenue: number
}

interface BrandStat {
  brand: string
  value: number
  count: number
}

export default function Analytics() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [brandStats, setBrandStats] = useState<BrandStat[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'stock'>('overview')

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

        // Daily sales — last 7 days
        const dailyMap: Record<string, DailySale> = {}
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return d.toLocaleDateString('en-PK')
        })
        last7.forEach(date => { dailyMap[date] = { date, total: 0, count: 0 } })
        salesList.forEach(sale => {
          const date = new Date(sale.sold_at).toLocaleDateString('en-PK')
          if (dailyMap[date]) {
            dailyMap[date].total += sale.total_amount || 0
            dailyMap[date].count += 1
          }
        })
        setDailySales(Object.values(dailyMap))

        // Top products
        const productMap: Record<string, TopProduct> = {}
        salesList.forEach(sale => {
          const name = sale.product?.name || 'Unknown'
          const brand = sale.product?.brand || ''
          if (!productMap[name]) productMap[name] = { name, brand, total_sold: 0, total_revenue: 0 }
          productMap[name].total_sold += sale.quantity || 0
          productMap[name].total_revenue += sale.total_amount || 0
        })
        setTopProducts(Object.values(productMap).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5))

        // Brand stats
        const brandMap: Record<string, BrandStat> = {}
        productsList.forEach(p => {
          const brand = p.brand || 'Other'
          if (!brandMap[brand]) brandMap[brand] = { brand, value: 0, count: 0 }
          brandMap[brand].value += (p.purchase_price || 0) * (p.quantity || 0)
          brandMap[brand].count += p.quantity || 0
        })
        setBrandStats(Object.values(brandMap).sort((a, b) => b.value - a.value))

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
  const totalCost = sales.reduce((sum, s) => sum + ((s.product?.purchase_price || 0) * (s.quantity || 0)), 0)
  const totalProfit = totalRevenue - totalCost
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0)
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 5)
  const outOfStock = products.filter(p => p.quantity === 0)
  const maxDaily = Math.max(...dailySales.map(d => d.total), 1)
  const maxBrand = Math.max(...brandStats.map(b => b.value), 1)
  const maxProduct = Math.max(...topProducts.map(p => p.total_revenue), 1)
  const todaySales = sales.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

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
        <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Insights</p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Analytics</h1>
      </div>

      {/* Stats Cards */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Revenue', value: `Rs.${totalRevenue.toLocaleString()}`, accent: 'var(--accent-green)', icon: '◈' },
          { label: 'Total Profit', value: `Rs.${totalProfit.toLocaleString()}`, accent: totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', icon: '◉' },
          { label: 'Profit Margin', value: `${profitMargin}%`, accent: 'var(--accent-blue)', icon: '◎' },
          { label: "Today's Sales", value: todaySales.length.toString(), accent: 'var(--accent-yellow)', icon: '▣' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: card.accent, fontSize: '18px' }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>{card.label}</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: card.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['overview', 'products', 'stock'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize',
            backgroundColor: activeTab === tab ? 'var(--accent-green-dim)' : 'transparent',
            border: `1px solid ${activeTab === tab ? 'var(--accent-green)' : 'var(--border)'}`,
            color: activeTab === tab ? 'var(--accent-green)' : 'var(--text-muted)',
          }}>{tab}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Daily Sales Bar Chart */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Daily Revenue</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Last 7 days</p>

            {/* Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px', marginBottom: '8px' }}>
              {dailySales.map((day, i) => {
                const height = maxDaily > 0 ? (day.total / maxDaily) * 140 : 0
                const isToday = i === dailySales.length - 1
                return (
                  <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                    <p style={{ fontSize: '10px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                      {day.total > 0 ? `${(day.total / 1000).toFixed(0)}k` : ''}
                    </p>
                    <div style={{
                      width: '100%', height: `${Math.max(height, 4)}px`,
                      backgroundColor: isToday ? 'var(--accent-green)' : 'var(--accent-green-dim)',
                      border: `1px solid ${isToday ? 'var(--accent-green)' : 'var(--border-bright)'}`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease',
                      position: 'relative',
                    }} />
                  </div>
                )
              })}
            </div>
            {/* X Axis Labels */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {dailySales.map((day, i) => (
                <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: i === dailySales.length - 1 ? 'var(--accent-green)' : 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {day.date.split('/')[0]}/{day.date.split('/')[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue vs Cost */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '20px' }}>Revenue vs Cost vs Profit</p>
            {[
              { label: 'Revenue', value: totalRevenue, color: 'var(--accent-green)' },
              { label: 'Cost', value: totalCost, color: 'var(--accent-blue)' },
              { label: 'Profit', value: totalProfit, color: 'var(--accent-yellow)' },
            ].map(item => {
              const max = Math.max(totalRevenue, totalCost, 1)
              const width = (Math.abs(item.value) / max) * 100
              return (
                <div key={item.label} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', color: item.color, fontFamily: 'IBM Plex Mono, monospace', fontWeight: '600' }}>Rs.{item.value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${width}%`, backgroundColor: item.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Brand Inventory Distribution */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Brand Inventory Distribution</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Total: Rs.{totalInventoryValue.toLocaleString()}</p>

            {brandStats.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No data available</p>
            ) : brandStats.map((brand, i) => {
              const colors = ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-yellow)', 'var(--accent-purple)', 'var(--accent-red)']
              const color = colors[i % colors.length]
              const width = (brand.value / maxBrand) * 100
              return (
                <div key={brand.brand} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{brand.brand}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{brand.count} pcs</span>
                    </div>
                    <span style={{ fontSize: '13px', color, fontFamily: 'IBM Plex Mono, monospace', fontWeight: '600' }}>Rs.{brand.value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${width}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Products Chart */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '20px' }}>Top 5 Products by Revenue</p>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sales data yet</p>
            ) : topProducts.map((product, i) => {
              const width = (product.total_revenue / maxProduct) * 100
              const colors = ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-yellow)', 'var(--accent-purple)', 'var(--accent-red)']
              return (
                <div key={product.name} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: `${colors[i]}20`, color: colors[i], fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0,
                      }}>{i + 1}</span>
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{product.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{product.total_sold} pcs sold</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', color: colors[i], fontFamily: 'IBM Plex Mono, monospace', fontWeight: '700' }}>Rs.{product.total_revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${width}%`, backgroundColor: colors[i], borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sales Summary Table */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '20px' }}>Sales Summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { label: 'Total Transactions', value: sales.length.toString(), accent: 'var(--accent-blue)' },
                { label: 'Avg Sale Value', value: `Rs.${sales.length > 0 ? Math.round(totalRevenue / sales.length).toLocaleString() : 0}`, accent: 'var(--accent-green)' },
                { label: 'Inventory Value', value: `Rs.${totalInventoryValue.toLocaleString()}`, accent: 'var(--accent-purple)' },
              ].map(item => (
                <div key={item.label} style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>{item.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: item.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stock Status Overview */}
          <div className="stock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total Products', value: products.length, accent: 'var(--accent-blue)' },
              { label: 'Low Stock', value: lowStock.length, accent: 'var(--accent-yellow)' },
              { label: 'Out of Stock', value: outOfStock.length, accent: 'var(--accent-red)' },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '8px' }}>{card.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: card.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Low Stock */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-yellow)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-yellow)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
              ⚠ Low Stock ({lowStock.length})
            </p>
            {lowStock.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>All products well stocked ✓</p>
            ) : lowStock.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < lowStock.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{p.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.brand}</p>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '700' }}>{p.quantity} pcs</span>
              </div>
            ))}
          </div>

          {/* Out of Stock */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-red)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-red)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
              ✕ Out of Stock ({outOfStock.length})
            </p>
            {outOfStock.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>All products available ✓</p>
            ) : outOfStock.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < outOfStock.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{p.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.brand}</p>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '700' }}>0 pcs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .analytics-grid { grid-template-columns: 1fr 1fr !important; }
          .stock-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}