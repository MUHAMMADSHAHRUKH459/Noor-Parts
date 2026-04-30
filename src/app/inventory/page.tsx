'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types'
import VoiceInput, { InventoryVoiceData } from '@/components/voice/VoiceInput'

const brands = ['Infinix', 'Techno', 'Oppo', 'Vivo', 'SparkX', 'Realme', 'Redmi', 'Google Pixel', 'iPhone', 'Samsung']
const partTypes = ['Back Glass', 'Fingerprint', 'Power Button', 'Ribbon', 'Display', 'Battery', 'Speaker', 'Other']

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
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

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSoldModal, setShowSoldModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const [newProduct, setNewProduct] = useState({
    brand: '', model: '', part_type: '',
    purchase_price: '', selling_price: '', quantity: '',
  })
  const [soldData, setSoldData] = useState({ quantity: '', selling_price: '' })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
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

  async function addProduct() {
    if (!newProduct.brand || !newProduct.model || !newProduct.part_type) return
    setSaving(true)
    try {
      const { error } = await supabase.from('products').insert([{
        name: `${newProduct.brand} ${newProduct.model} ${newProduct.part_type}`,
        brand: newProduct.brand, model: newProduct.model, part_type: newProduct.part_type,
        purchase_price: parseFloat(newProduct.purchase_price) || 0,
        selling_price: parseFloat(newProduct.selling_price) || 0,
        quantity: parseInt(newProduct.quantity) || 0,
        category_id: null,
      }])
      if (error) throw error
      setShowAddModal(false)
      setNewProduct({ brand: '', model: '', part_type: '', purchase_price: '', selling_price: '', quantity: '' })
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

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
        .update({ quantity: selectedProduct.quantity - quantity }).eq('id', selectedProduct.id)
      if (updateError) throw updateError
      setShowSoldModal(false)
      setSoldData({ quantity: '', selling_price: '' })
      setSelectedProduct(null)
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.model?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="inv-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Stock</p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Total: {products.length} products</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <VoiceInput
            mode="inventory"
            onInventoryResult={(data: Partial<InventoryVoiceData>) => {
              setNewProduct(prev => ({
                ...prev,
                brand: data.brand || prev.brand,
                model: data.model || prev.model,
                part_type: data.part_type || prev.part_type,
                quantity: data.quantity || prev.quantity,
                purchase_price: data.purchase_price || prev.purchase_price,
                selling_price: data.selling_price || prev.selling_price,
              }))
              setShowAddModal(true)
            }}
            onSaleResult={() => {}}
          />
          <button onClick={() => setShowAddModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)',
            borderRadius: '8px', color: 'var(--accent-green)',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>
            + Add Karo
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍  Search karo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, padding: '12px 16px' }}
        />
      </div>

      {/* Desktop Table */}
      <div className="desktop-table" style={{
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Brand', 'Part', 'Stock', 'Buy Price', 'Sell Price', 'Action'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '14px 20px',
                  fontSize: '11px', letterSpacing: '1px', color: 'var(--text-muted)',
                  textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>◫</div>
                  <p style={{ fontSize: '13px' }}>Koi product nahi mila</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, i) => (
                <tr key={product.id} style={{ borderBottom: i < filteredProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{product.name}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>{product.brand}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>{product.part_type}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                      fontFamily: 'IBM Plex Mono, monospace',
                      backgroundColor: product.quantity > 10 ? 'var(--accent-green-dim)' : product.quantity > 0 ? 'var(--accent-yellow-dim)' : 'var(--accent-red-dim)',
                      color: product.quantity > 10 ? 'var(--accent-green)' : product.quantity > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                    }}>{product.quantity} pcs</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{product.purchase_price?.toLocaleString()}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{product.selling_price?.toLocaleString()}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => { setSelectedProduct(product); setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' }); setShowSoldModal(true) }}
                      style={{ padding: '6px 14px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Sold ✓
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-cards" style={{ display: 'none' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>◫</div>
            <p style={{ fontSize: '13px' }}>Koi product nahi mila</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} style={{
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '16px', marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{product.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.brand} • {product.part_type}</p>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, marginLeft: '8px',
                  backgroundColor: product.quantity > 10 ? 'var(--accent-green-dim)' : product.quantity > 0 ? 'var(--accent-yellow-dim)' : 'var(--accent-red-dim)',
                  color: product.quantity > 10 ? 'var(--accent-green)' : product.quantity > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                }}>{product.quantity} pcs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Buy</p>
                    <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.purchase_price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Sell</p>
                    <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.selling_price?.toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedProduct(product); setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' }); setShowSoldModal(true) }}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  Sold ✓
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>INVENTORY</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px' }}>Product Add Karo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <select value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} style={inputStyle}>
                  <option value="">Brand select karo</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                <input type="text" placeholder="Hot 10, Note 12, A54..." value={newProduct.model} onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Part Type</label>
                <select value={newProduct.part_type} onChange={(e) => setNewProduct({ ...newProduct, part_type: e.target.value })} style={inputStyle}>
                  <option value="">Part select karo</option>
                  {partTypes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Buy Price</label>
                  <input type="number" placeholder="Rs." value={newProduct.purchase_price} onChange={(e) => setNewProduct({ ...newProduct, purchase_price: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sell Price</label>
                  <input type="number" placeholder="Rs." value={newProduct.selling_price} onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" placeholder="Kitne piece hain?" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addProduct} disabled={saving} style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Add Karo ✓'}</button>
            </div>
          </div>
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
                <input type="number" placeholder="Kitne piece?" value={soldData.quantity} onChange={(e) => setSoldData({ ...soldData, quantity: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Selling Price</label>
                <input type="number" placeholder="Rs." value={soldData.selling_price} onChange={(e) => setSoldData({ ...soldData, selling_price: e.target.value })} style={inputStyle} />
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
              <button onClick={() => { setShowSoldModal(false); setSelectedProduct(null) }} style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={markAsSold} disabled={saving} style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Sell Confirm ✓'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: block !important; }
        }
      `}</style>
    </div>
  )
}