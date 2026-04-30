'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sale, Product } from '@/types'
import VoiceInput, { SaleVoiceData } from '@/components/voice/VoiceInput'

const inputStyle = {
  width: '100%', padding: '10px 14px',
  backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
}
const labelStyle = {
  fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px',
  textTransform: 'uppercase' as const, fontFamily: 'IBM Plex Mono, monospace',
  marginBottom: '6px', display: 'block',
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newSale, setNewSale] = useState({ product_id: '', quantity: '', selling_price: '' })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [{ data: salesData }, { data: productsData }] = await Promise.all([
          supabase.from('sales').select('*, product:products(*)').order('sold_at', { ascending: false }),
          supabase.from('products').select('*').gt('quantity', 0).order('name'),
        ])
        if (!isMounted) return
        setSales(salesData || [])
        setProducts(productsData || [])
        setTotalRevenue(salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0)
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  async function refetch() {
    const [{ data: salesData }, { data: productsData }] = await Promise.all([
      supabase.from('sales').select('*, product:products(*)').order('sold_at', { ascending: false }),
      supabase.from('products').select('*').gt('quantity', 0).order('name'),
    ])
    setSales(salesData || [])
    setProducts(productsData || [])
    setTotalRevenue(salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0)
  }

  async function addSale() {
    if (!newSale.product_id || !newSale.quantity || !newSale.selling_price) return
    setSaving(true)
    try {
      const product = products.find(p => p.id === newSale.product_id)
      if (!product) return
      const quantity = parseInt(newSale.quantity)
      const selling_price = parseFloat(newSale.selling_price)
      const { error: saleError } = await supabase.from('sales').insert([{ product_id: newSale.product_id, quantity, selling_price, total_amount: quantity * selling_price }])
      if (saleError) throw saleError
      const { error: updateError } = await supabase.from('products').update({ quantity: product.quantity - quantity }).eq('id', product.id)
      if (updateError) throw updateError
      setShowSaleModal(false)
      setNewSale({ product_id: '', quantity: '', selling_price: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const todaySales = sales.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
  const filteredSales = sales.filter(s =>
    s.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.product?.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Records</p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Sales</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Revenue: <span style={{ color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{totalRevenue.toLocaleString()}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <VoiceInput
            mode="sale"
            onInventoryResult={() => {}}
            onSaleResult={(data: Partial<SaleVoiceData>) => {
              const detectedProduct = products.find(p =>
                data.product_name && (
                  p.name.toLowerCase().includes(data.product_name.toLowerCase()) ||
                  p.brand.toLowerCase().includes(data.product_name.toLowerCase())
                )
              )
              setNewSale(prev => ({
                ...prev,
                product_id: detectedProduct ? detectedProduct.id : prev.product_id,
                quantity: data.quantity || prev.quantity,
                selling_price: data.selling_price || prev.selling_price,
              }))
              setShowSaleModal(true)
            }}
          />
          <button onClick={() => setShowSaleModal(true)} style={{
            padding: '10px 18px', backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)', borderRadius: '8px',
            color: 'var(--accent-green)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>+ Sale Add Karo</button>
        </div>
      </div>

      {/* Stats */}
      <div className="sales-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Total Sales', value: sales.length, format: 'number', accent: 'var(--accent-blue)' },
          { label: 'Total Revenue', value: totalRevenue, format: 'currency', accent: 'var(--accent-green)' },
          { label: 'Aaj Ki Sales', value: todaySales.length, format: 'number', accent: 'var(--accent-yellow)' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '8px' }}>{card.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: card.accent, fontFamily: 'IBM Plex Mono, monospace' }}>
              {card.format === 'currency' ? `Rs.${card.value.toLocaleString()}` : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <input type="text" placeholder="🔍  Sale search karo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, padding: '12px 16px' }} />
      </div>

      {/* Desktop Table */}
      <div className="desktop-table" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Brand', 'Qty', 'Price', 'Total', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: '11px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>◈</div>
                <p style={{ fontSize: '13px' }}>Koi sale nahi mili</p>
              </td></tr>
            ) : filteredSales.map((sale, i) => (
              <tr key={sale.id} style={{ borderBottom: i < filteredSales.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{sale.product?.name || 'N/A'}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>{sale.product?.brand || 'N/A'}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>{sale.quantity} pcs</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.selling_price?.toLocaleString()}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'IBM Plex Mono, monospace' }}><span style={{ color: 'var(--accent-green)', fontWeight: '600', fontSize: '13px' }}>Rs.{sale.total_amount?.toLocaleString()}</span></td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{new Date(sale.sold_at).toLocaleDateString('en-PK')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-cards" style={{ display: 'none' }}>
        {filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>◈</div>
            <p style={{ fontSize: '13px' }}>Koi sale nahi mili</p>
          </div>
        ) : filteredSales.map(sale => (
          <div key={sale.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{sale.product?.name || 'N/A'}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sale.product?.brand} • {new Date(sale.sold_at).toLocaleDateString('en-PK')}</p>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.total_amount?.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Qty</p><p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>{sale.quantity} pcs</p></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Price</p><p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{sale.selling_price?.toLocaleString()}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Sale Modal */}
      {showSaleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>SALES</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px' }}>Sale Add Karo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Product</label>
                <select value={newSale.product_id} onChange={(e) => { const product = products.find(p => p.id === e.target.value); setNewSale({ ...newSale, product_id: e.target.value, selling_price: product ? product.selling_price.toString() : '' }) }} style={inputStyle}>
                  <option value="">Product select karo</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" placeholder="Kitne piece?" value={newSale.quantity} onChange={(e) => setNewSale({ ...newSale, quantity: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Selling Price</label>
                <input type="number" placeholder="Rs." value={newSale.selling_price} onChange={(e) => setNewSale({ ...newSale, selling_price: e.target.value })} style={inputStyle} />
              </div>
              {newSale.quantity && newSale.selling_price && (
                <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                  <p style={{ color: 'var(--accent-green)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{(parseInt(newSale.quantity) * parseFloat(newSale.selling_price)).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setShowSaleModal(false); setNewSale({ product_id: '', quantity: '', selling_price: '' }) }} style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addSale} disabled={saving} style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Sale Confirm ✓'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: block !important; }
          .sales-stats { grid-template-columns: 1fr 1fr !important; }
          .sales-stats > div:last-child { grid-column: span 2; }
        }
      `}</style>
    </div>
  )
}