'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types'

const inputStyle = {
  width: '100%',
  padding: '14px 20px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  fontSize: '16px',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
}

const labelStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  fontFamily: 'IBM Plex Mono, monospace',
  marginBottom: '6px',
  display: 'block',
}

const soldInputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
}

type FilterType = 'all' | 'in_stock' | 'low' | 'out'

export default function Search() {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showSoldModal, setShowSoldModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [soldData, setSoldData] = useState({ quantity: '', selling_price: '' })
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const { data } = await supabase.from('products').select('*').order('name')
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

  // Derived filtered list — no setState in useEffect
  const filtered = useMemo(() => {
    let result = products

    if (query.trim()) {
      const lower = query.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower) ||
        p.model?.toLowerCase().includes(lower) ||
        p.part_type?.toLowerCase().includes(lower)
      )
    }

    if (activeFilter === 'in_stock') result = result.filter(p => p.quantity > 10)
    else if (activeFilter === 'low') result = result.filter(p => p.quantity > 0 && p.quantity <= 10)
    else if (activeFilter === 'out') result = result.filter(p => p.quantity === 0)

    return result
  }, [query, activeFilter, products])

  async function markAsSold() {
    if (!selectedProduct || !soldData.quantity || !soldData.selling_price) return
    setSaving(true)
    try {
      const quantity = parseInt(soldData.quantity)
      const selling_price = parseFloat(soldData.selling_price)
      const { error: saleError } = await supabase.from('sales').insert([{
        product_id: selectedProduct.id, quantity, selling_price,
        total_amount: quantity * selling_price,
      }])
      if (saleError) throw saleError
      const { error: updateError } = await supabase.from('products')
        .update({ quantity: selectedProduct.quantity - quantity })
        .eq('id', selectedProduct.id)
      if (updateError) throw updateError

      // Update local state without refetch
      setProducts(prev =>
        prev.map(p => p.id === selectedProduct.id ? { ...p, quantity: p.quantity - quantity } : p)
      )
      setShowSoldModal(false)
      setSoldData({ quantity: '', selling_price: '' })
      setSelectedProduct(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Sab' },
    { key: 'in_stock', label: 'In Stock' },
    { key: 'low', label: 'Low Stock' },
    { key: 'out', label: 'Out of Stock' },
  ]

  // Group by brand when no search active
  const brands = useMemo(
    () => [...new Set(filtered.map(p => p.brand).filter(Boolean))],
    [filtered]
  )

  const isSearching = query.trim() !== '' || activeFilter !== 'all'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Dhundho</p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Search</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          {products.length} products available
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{
          position: 'absolute', left: '16px', top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '18px', color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          placeholder="Brand, model ya part type likho..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ ...inputStyle, paddingLeft: '48px' }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '14px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '18px', padding: '4px',
            }}
          >✕</button>
        )}
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setActiveFilter(btn.key)}
            style={{
              padding: '6px 14px', borderRadius: '20px',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: activeFilter === btn.key ? 'var(--accent-green-dim)' : 'var(--bg-card)',
              border: `1px solid ${activeFilter === btn.key ? 'var(--accent-green)' : 'var(--border)'}`,
              color: activeFilter === btn.key ? 'var(--accent-green)' : 'var(--text-secondary)',
            }}
          >
            {btn.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {filtered.length} results
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--accent-green)' }}>◎</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>Loading...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>◫</div>
          <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Koi product nahi mila
          </p>
          {query && (
            <p style={{ fontSize: '13px' }}>
              &ldquo;{query}&rdquo; ke liye koi result nahi
            </p>
          )}
        </div>
      ) : isSearching ? (
        // Flat list when searching or filtering
        <div>
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSell={() => {
                setSelectedProduct(product)
                setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' })
                setShowSoldModal(true)
              }}
            />
          ))}
        </div>
      ) : (
        // Grouped by brand when idle
        <div>
          {brands.map(brand => {
            const brandProducts = filtered.filter(p => p.brand === brand)
            return (
              <div key={brand} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-green)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '600' }}>{brand}</p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{brandProducts.length} items</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                </div>
                {brandProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSell={() => {
                      setSelectedProduct(product)
                      setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' })
                      setShowSoldModal(true)
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Sold Modal */}
      {showSoldModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>SALE</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Product Sell Karo</h2>
            <p style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '24px', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedProduct.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" placeholder="Kitne piece?" value={soldData.quantity} onChange={(e) => setSoldData({ ...soldData, quantity: e.target.value })} style={soldInputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Selling Price</label>
                <input type="number" placeholder="Rs." value={soldData.selling_price} onChange={(e) => setSoldData({ ...soldData, selling_price: e.target.value })} style={soldInputStyle} />
              </div>
              {soldData.quantity && soldData.selling_price && (
                <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                  <p style={{ color: 'var(--accent-green)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>
                    Rs.{(parseInt(soldData.quantity) * parseFloat(soldData.selling_price)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setShowSoldModal(false); setSelectedProduct(null) }}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={markAsSold} disabled={saving}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Sell Confirm ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onSell }: { product: Product; onSell: () => void }) {
  const stockColor = product.quantity > 10
    ? 'var(--accent-green)'
    : product.quantity > 0
    ? 'var(--accent-yellow)'
    : 'var(--accent-red)'

  const stockBg = product.quantity > 10
    ? 'var(--accent-green-dim)'
    : product.quantity > 0
    ? 'var(--accent-yellow-dim)'
    : 'var(--accent-red-dim)'

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.brand}</span>
          <span style={{ fontSize: '12px', color: 'var(--border)' }}>•</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.part_type}</span>
        </div>
      </div>

      {/* Prices — hidden on very small screens */}
      <div className="card-prices" style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Buy</p>
          <p style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.purchase_price?.toLocaleString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Sell</p>
          <p style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.selling_price?.toLocaleString()}</p>
        </div>
      </div>

      {/* Stock Badge */}
      <span style={{
        padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
        fontWeight: '600', fontFamily: 'IBM Plex Mono, monospace',
        backgroundColor: stockBg, color: stockColor, flexShrink: 0,
      }}>
        {product.quantity} pcs
      </span>

      {/* Sell Button */}
      <button
        onClick={onSell}
        disabled={product.quantity === 0}
        style={{
          padding: '7px 14px',
          backgroundColor: product.quantity === 0 ? 'var(--bg-hover)' : 'var(--accent-red-dim)',
          border: `1px solid ${product.quantity === 0 ? 'var(--border)' : 'var(--accent-red)'}`,
          borderRadius: '8px',
          color: product.quantity === 0 ? 'var(--text-muted)' : 'var(--accent-red)',
          fontSize: '12px', fontWeight: '600',
          cursor: product.quantity === 0 ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        {product.quantity === 0 ? 'Out' : 'Sold ✓'}
      </button>

      <style>{`
        @media (max-width: 480px) {
          .card-prices { display: none !important; }
        }
      `}</style>
    </div>
  )
}