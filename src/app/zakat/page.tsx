'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types'

const NISAB_GOLD_GRAMS = 87.48
const GOLD_PRICE_PER_GRAM_PKR = 21000
const NISAB_VALUE = NISAB_GOLD_GRAMS * GOLD_PRICE_PER_GRAM_PKR
const ZAKAT_RATE = 0.025

export default function Zakat() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [customNisab, setCustomNisab] = useState(NISAB_VALUE.toString())

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*')
        if (error) throw error
        if (isMounted) setProducts(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0)
  const nisabValue = parseFloat(customNisab) || NISAB_VALUE
  const isZakatApplicable = totalInventoryValue >= nisabValue
  const zakatAmount = isZakatApplicable ? totalInventoryValue * ZAKAT_RATE : 0

  const brandBreakdown = products.reduce<Record<string, number>>((acc, p) => {
    const brand = p.brand || 'Other'
    acc[brand] = (acc[brand] || 0) + ((p.purchase_price || 0) * (p.quantity || 0))
    return acc
  }, {})
  const brandList = Object.entries(brandBreakdown).sort((a, b) => b[1] - a[1])

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
    outline: 'none', fontFamily: 'IBM Plex Mono, monospace',
  }

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
        <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Islamic Finance</p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Zakat Calculator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Maal ki zakat 2.5% hoti hai — nisab se zyada ho tab</p>
      </div>

      {/* Main Grid — stacks on mobile */}
      <div className="zakat-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Calculation Card */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isZakatApplicable ? 'var(--accent-green)' : 'var(--border)'}`, borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '24px' }}>Calculation</p>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Maal (Inventory Value)</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{totalInventoryValue.toLocaleString()}</p>
          </div>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Nisab Value (Customize kar sakte ho)</p>
            <input type="number" value={customNisab} onChange={(e) => setCustomNisab(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
              Default: 87.48g × Rs.21,000 = Rs.{NISAB_VALUE.toLocaleString()}
            </p>
          </div>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Zakat Status</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', backgroundColor: isZakatApplicable ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${isZakatApplicable ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
              <span style={{ fontSize: '14px' }}>{isZakatApplicable ? '✓' : '✕'}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: isZakatApplicable ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {isZakatApplicable ? 'Zakat Wajib Hai' : 'Zakat Wajib Nahi'}
              </span>
            </div>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Zakat Amount (2.5%)</p>
            <p style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace', color: isZakatApplicable ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
              Rs.{zakatAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Islamic Info */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>Zakat ke Usool</p>
            {[
              { label: 'Nisab', value: 'Maal nisab se zyada ho' },
              { label: 'Hawl', value: 'Ek saal guzra ho' },
              { label: 'Rate', value: '2.5% total maal par' },
              { label: 'Maal', value: 'Purchase price par calculate' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', minWidth: '60px' }}>{item.label}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Brand Breakdown */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', flex: 1 }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>Brand Breakdown</p>
            {brandList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Koi product nahi</p>
            ) : brandList.map(([brand, value]) => {
              const percent = totalInventoryValue > 0 ? (value / totalInventoryValue) * 100 : 0
              return (
                <div key={brand} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{brand}</span>
                    <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, backgroundColor: 'var(--accent-blue)', borderRadius: '2px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>Summary</p>
        <div className="zakat-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total Products', value: products.length.toString(), accent: 'var(--accent-blue)' },
            { label: 'Total Maal', value: `Rs.${totalInventoryValue.toLocaleString()}`, accent: 'var(--accent-blue)' },
            { label: 'Nisab Value', value: `Rs.${nisabValue.toLocaleString()}`, accent: 'var(--accent-yellow)' },
            { label: 'Zakat Due', value: `Rs.${zakatAmount.toLocaleString()}`, accent: 'var(--accent-green)' },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</p>
              <p style={{ fontSize: '15px', fontWeight: '700', color: item.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .zakat-main { grid-template-columns: 1fr !important; }
          .zakat-summary { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}