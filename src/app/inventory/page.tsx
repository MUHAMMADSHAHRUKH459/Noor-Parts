'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types'
import VoiceInput, { InventoryVoiceData } from '@/components/voice/VoiceInput'

const brandData = [
  { name: 'Infinix', icon: '📱', models: ['Hot 8', 'Hot 9', 'Hot 10', 'Hot 11', 'Hot 12', 'Hot 20', 'Hot 30', 'Note 10', 'Note 11', 'Note 12', 'Note 30', 'Smart 6', 'Smart 7', 'Zero 20', 'Zero 30'] },
  { name: 'Techno', icon: '📲', models: ['Camon 15', 'Camon 16', 'Camon 17', 'Camon 18', 'Camon 19', 'Camon 20', 'Spark 6', 'Spark 7', 'Spark 8', 'Spark 9', 'Spark 10', 'Pop 5', 'Pop 6', 'Pop 7'] },
  { name: 'Oppo', icon: '🔷', models: ['A15', 'A16', 'A17', 'A31', 'A33', 'A54', 'A55', 'A57', 'A74', 'A76', 'A78', 'A95', 'A96', 'Reno 5', 'Reno 6', 'Reno 7', 'Reno 8', 'F19', 'F21'] },
  { name: 'Vivo', icon: '🔵', models: ['Y01', 'Y11', 'Y15', 'Y16', 'Y20', 'Y21', 'Y22', 'Y27', 'Y33', 'Y35', 'Y51', 'Y52', 'Y53', 'Y72', 'Y76', 'V20', 'V21', 'V23', 'V25'] },
  { name: 'Realme', icon: '🟡', models: ['C11', 'C15', 'C20', 'C21', 'C25', 'C30', 'C31', 'C33', 'C35', 'C51', 'C53', 'C55', 'C67', '5i', '6i', '7i', '8', '8i', '9', '9i', '10', 'Narzo 50'] },
  { name: 'Redmi', icon: '🔴', models: ['9A', '9C', '10', '10A', '10C', '12', '12C', 'A1', 'A2', 'Note 9', 'Note 10', 'Note 11', 'Note 12', 'Note 12 Pro', 'Note 13', 'Note 13 Pro'] },
  { name: 'Samsung', icon: '🌀', models: ['A03', 'A03s', 'A04', 'A04s', 'A05', 'A12', 'A13', 'A14', 'A15', 'A22', 'A23', 'A24', 'A25', 'A32', 'A33', 'A34', 'A35', 'A52', 'A53', 'A54', 'A55', 'M12', 'M13', 'M14', 'M32', 'M33'] },
  { name: 'iPhone', icon: '🍎', models: ['6', '6s', '7', '7 Plus', '8', '8 Plus', 'X', 'XR', 'XS', '11', '11 Pro', '12', '12 Pro', '13', '13 Pro', '14', '14 Pro', '15', '15 Pro'] },
  { name: 'SparkX', icon: '⚡', models: ['1', '2', 'Pro', 'Ultra'] },
  { name: 'Google Pixel', icon: '🔍', models: ['4', '4a', '5', '5a', '6', '6a', '6 Pro', '7', '7a', '7 Pro', '8', '8a', '8 Pro'] },
  { name: 'Nokia', icon: '📡', models: ['C01 Plus', 'C20', 'C21', 'C30', 'G10', 'G20', 'G21', 'G50', '2.4', '3.4', '5.4'] },
  { name: 'Xiaomi', icon: '🟠', models: ['11 Lite', '12', '12 Pro', 'Poco M3', 'Poco M4', 'Poco X3', 'Poco X4', 'Poco F3', 'Poco F4'] },
]

const partTypes = [
  { name: 'Back Glass', icon: '🔲', color: 'var(--accent-blue)' },
  { name: 'Display', icon: '📺', color: 'var(--accent-green)' },
  { name: 'Fingerprint', icon: '👆', color: 'var(--accent-purple)' },
  { name: 'Battery', icon: '🔋', color: 'var(--accent-yellow)' },
  { name: 'Power Button', icon: '⏻', color: 'var(--accent-red)' },
  { name: 'Volume Button', icon: '🔊', color: 'var(--accent-blue)' },
  { name: 'Speaker', icon: '🔉', color: 'var(--accent-green)' },
  { name: 'Ribbon', icon: '🎗️', color: 'var(--accent-purple)' },
  { name: 'Charging Port', icon: '🔌', color: 'var(--accent-yellow)' },
  { name: 'Camera Lens', icon: '📷', color: 'var(--accent-red)' },
  { name: 'Sim Tray', icon: '💳', color: 'var(--accent-blue)' },
  { name: 'Other', icon: '🔧', color: 'var(--text-muted)' },
]

const inputStyle = {
  width: '100%', padding: '10px 14px',
  backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
}

const labelStyle = {
  fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px',
  textTransform: 'uppercase' as const, fontFamily: 'IBM Plex Mono, monospace',
  marginBottom: '8px', display: 'block',
}

const emptyForm = { brand: '', model: '', part_type: '', purchase_price: '', selling_price: '', quantity: '' }

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSoldModal, setShowSoldModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [soldData, setSoldData] = useState({ quantity: '', selling_price: '' })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
        if (isMounted) setProducts(data || [])
      } catch (err) { console.error(err) }
      finally { if (isMounted) setLoading(false) }
    }
    load()
    return () => { isMounted = false }
  }, [])

  async function refetch() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
  }

  const uniqueBrands = useMemo(() => brandData.filter((b, i, arr) => arr.findIndex(x => x.name === b.name) === i), [])
  const selectedBrandData = brandData.find(b => b.name === form.brand)
  const filteredModels = useMemo(() => {
    if (!selectedBrandData) return []
    if (!modelSearch) return selectedBrandData.models
    return selectedBrandData.models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))
  }, [selectedBrandData, modelSearch])

  const profitPreview = useMemo(() => {
    const buy = parseFloat(form.purchase_price) || 0
    const sell = parseFloat(form.selling_price) || 0
    const qty = parseInt(form.quantity) || 0
    if (!buy || !sell || !qty) return null
    const profitPerPiece = sell - buy
    return {
      profitPerPiece,
      totalProfit: profitPerPiece * qty,
      margin: buy > 0 ? ((profitPerPiece / buy) * 100).toFixed(0) : 0
    }
  }, [form.purchase_price, form.selling_price, form.quantity])

  const filteredProducts = useMemo(() => products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.part_type?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [products, searchQuery])

  const stockStats = useMemo(() => ({
    total: products.length,
    inStock: products.filter(p => p.quantity > 10).length,
    low: products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
    out: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0),
  }), [products])

  async function addProduct() {
    if (!form.brand || !form.model || !form.part_type || !form.purchase_price || !form.quantity) return
    setSaving(true)
    try {
      const { data: existing } = await supabase.from('products').select('*')
        .eq('brand', form.brand).eq('model', form.model).eq('part_type', form.part_type).single()
      if (existing) {
        await supabase.from('products').update({
          quantity: existing.quantity + parseInt(form.quantity),
          purchase_price: parseFloat(form.purchase_price),
          selling_price: parseFloat(form.selling_price) || existing.selling_price,
        }).eq('id', existing.id)
      } else {
        await supabase.from('products').insert([{
          name: `${form.brand} ${form.model} ${form.part_type}`,
          brand: form.brand, model: form.model, part_type: form.part_type,
          purchase_price: parseFloat(form.purchase_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0,
          quantity: parseInt(form.quantity) || 0, category_id: null,
        }])
      }
      setShowAddModal(false); setForm(emptyForm); setModelSearch(''); await refetch()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function updateProduct() {
    if (!selectedProduct) return
    setSaving(true)
    try {
      await supabase.from('products').update({
        name: `${editForm.brand} ${editForm.model} ${editForm.part_type}`,
        brand: editForm.brand, model: editForm.model, part_type: editForm.part_type,
        purchase_price: parseFloat(editForm.purchase_price) || 0,
        selling_price: parseFloat(editForm.selling_price) || 0,
        quantity: parseInt(editForm.quantity) || 0,
      }).eq('id', selectedProduct.id)
      setShowEditModal(false); await refetch()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function deleteProduct() {
    if (!selectedProduct) return
    setDeleting(true)
    try {
      await supabase.from('products').delete().eq('id', selectedProduct.id)
      setShowDeleteConfirm(false); setSelectedProduct(null); await refetch()
    } catch (err) { console.error(err) }
    finally { setDeleting(false) }
  }

  async function markAsSold() {
    if (!selectedProduct || !soldData.quantity || !soldData.selling_price) return
    setSaving(true)
    try {
      const quantity = parseInt(soldData.quantity)
      const selling_price = parseFloat(soldData.selling_price)
      await supabase.from('sales').insert([{
        product_id: selectedProduct.id, quantity, selling_price,
        total_amount: quantity * selling_price
      }])
      await supabase.from('products').update({
        quantity: selectedProduct.quantity - quantity
      }).eq('id', selectedProduct.id)
      setShowSoldModal(false); setSoldData({ quantity: '', selling_price: '' }); setSelectedProduct(null); await refetch()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  function openEditModal(product: Product) {
    setSelectedProduct(product)
    setEditForm({
      brand: product.brand || '', model: product.model || '', part_type: product.part_type || '',
      purchase_price: product.purchase_price?.toString() || '',
      selling_price: product.selling_price?.toString() || '',
      quantity: product.quantity?.toString() || ''
    })
    setShowEditModal(true)
  }

  const isFormValid = form.brand && form.model && form.part_type && form.purchase_price && form.quantity

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--accent-green)' }}>◎</div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Stock</p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Inventory</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <VoiceInput mode="inventory"
            onInventoryResult={(data: Partial<InventoryVoiceData>) => {
              setForm(prev => ({
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
            padding: '10px 20px', backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)', borderRadius: '8px',
            color: 'var(--accent-green)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>+ Add Product</button>
        </div>
      </div>

      {/* Total Inventory Value Banner */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--accent-green)',
        borderRadius: '12px', padding: '18px 24px',
        marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Total Inventory Value</p>
          <p style={{ fontSize: '30px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-1px' }}>
            Rs.{stockStats.totalValue.toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Zakat (2.5%)</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Rs.{(stockStats.totalValue * 0.025).toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Total Products</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {stockStats.total}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Stats */}
      <div className="stock-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Products', value: stockStats.total, color: 'var(--accent-blue)' },
          { label: 'In Stock', value: stockStats.inStock, color: 'var(--accent-green)' },
          { label: 'Low Stock', value: stockStats.low, color: 'var(--accent-yellow)' },
          { label: 'Out of Stock', value: stockStats.out, color: 'var(--accent-red)' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: 'IBM Plex Mono, monospace' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
        <input type="text" placeholder="Search by brand, model or part type..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, padding: '12px 16px 12px 42px' }} />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="desktop-table" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Brand', 'Part', 'Stock', 'Buy', 'Sell', 'Profit', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>◫</div>
                <p style={{ fontSize: '13px' }}>No products found</p>
              </td></tr>
            ) : filteredProducts.map((product, i) => {
              const profit = (product.selling_price || 0) - (product.purchase_price || 0)
              return (
                <tr key={product.id} style={{ borderBottom: i < filteredProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' }}>{product.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{product.brand}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{product.part_type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', fontFamily: 'IBM Plex Mono, monospace',
                      backgroundColor: product.quantity > 10 ? 'var(--accent-green-dim)' : product.quantity > 0 ? 'var(--accent-yellow-dim)' : 'var(--accent-red-dim)',
                      color: product.quantity > 10 ? 'var(--accent-green)' : product.quantity > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                    }}>{product.quantity} pcs</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{product.purchase_price?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{product.selling_price?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {profit >= 0 ? '+' : ''}Rs.{profit.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => { setSelectedProduct(product); setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' }); setShowSoldModal(true) }}
                        style={{ padding: '5px 10px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '6px', color: 'var(--accent-green)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Sell</button>
                      <button onClick={() => openEditModal(product)}
                        style={{ padding: '5px 10px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '6px', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => { setSelectedProduct(product); setShowDeleteConfirm(true) }}
                        style={{ padding: '5px 8px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-cards" style={{ display: 'none' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>◫</div>
            <p>No products found</p>
          </div>
        ) : filteredProducts.map(product => {
          const profit = (product.selling_price || 0) - (product.purchase_price || 0)
          return (
            <div key={product.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
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
              <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Buy</p>
                  <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.purchase_price?.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Sell</p>
                  <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{product.selling_price?.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Profit</p>
                  <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {profit >= 0 ? '+' : ''}Rs.{profit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setSelectedProduct(product); setSoldData({ quantity: '', selling_price: product.selling_price?.toString() || '' }); setShowSoldModal(true) }}
                  style={{ flex: 1, padding: '8px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '6px', color: 'var(--accent-green)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Sell</button>
                <button onClick={() => openEditModal(product)}
                  style={{ flex: 1, padding: '8px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '6px', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => { setSelectedProduct(product); setShowDeleteConfirm(true) }}
                  style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1 }}>
              <div>
                <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>INVENTORY</p>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Add New Product</h2>
              </div>
              <button onClick={() => { setShowAddModal(false); setForm(emptyForm); setModelSearch('') }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 12px', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Step 1: Brand */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>1 — Select Brand</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {uniqueBrands.map(brand => (
                    <button key={brand.name} onClick={() => { setForm(f => ({ ...f, brand: brand.name, model: '' })); setModelSearch('') }}
                      style={{ padding: '10px 8px', borderRadius: '8px', border: `1px solid ${form.brand === brand.name ? 'var(--accent-green)' : 'var(--border)'}`, backgroundColor: form.brand === brand.name ? 'var(--accent-green-dim)' : 'var(--bg-primary)', color: form.brand === brand.name ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: form.brand === brand.name ? '600' : '400', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: '20px', marginBottom: '5px' }}>{brand.icon}</div>
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Model */}
              {form.brand && (
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>2 — Select or Type Model</label>
                  <input type="text" placeholder="Search or type model name..." value={form.model}
                    onChange={(e) => { setForm(f => ({ ...f, model: e.target.value })); setModelSearch(e.target.value) }}
                    style={{ ...inputStyle, marginBottom: '10px' }} />
                  {filteredModels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {filteredModels.map(model => (
                        <button key={model} onClick={() => { setForm(f => ({ ...f, model })); setModelSearch('') }}
                          style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${form.model === model ? 'var(--accent-green)' : 'var(--border)'}`, backgroundColor: form.model === model ? 'var(--accent-green-dim)' : 'var(--bg-primary)', color: form.model === model ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', transition: 'all 0.1s' }}>
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Part Type */}
              {form.model && (
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>3 — Select Part Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {partTypes.map(part => (
                      <button key={part.name} onClick={() => setForm(f => ({ ...f, part_type: part.name }))}
                        style={{ padding: '12px 8px', borderRadius: '8px', border: `1px solid ${form.part_type === part.name ? part.color : 'var(--border)'}`, backgroundColor: form.part_type === part.name ? `${part.color}18` : 'var(--bg-primary)', color: form.part_type === part.name ? part.color : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: form.part_type === part.name ? '600' : '400', textAlign: 'center', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: '18px', marginBottom: '5px' }}>{part.icon}</div>
                        {part.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Pricing */}
              {form.part_type && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>4 — Pricing & Quantity</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '10px' }}>Buy Price (Rs.)</label>
                      <input type="number" placeholder="e.g. 300" value={form.purchase_price} onChange={(e) => setForm(f => ({ ...f, purchase_price: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '10px' }}>Sell Price (Rs.)</label>
                      <input type="number" placeholder="e.g. 500" value={form.selling_price} onChange={(e) => setForm(f => ({ ...f, selling_price: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '10px' }}>Quantity</label>
                      <input type="number" placeholder="e.g. 50" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  {profitPreview && (
                    <div style={{ backgroundColor: profitPreview.profitPerPiece >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${profitPreview.profitPerPiece >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', gap: '24px' }}>
                      {[
                        { label: 'Profit/piece', value: `Rs.${profitPreview.profitPerPiece.toLocaleString()}` },
                        { label: 'Total Profit', value: `Rs.${profitPreview.totalProfit.toLocaleString()}` },
                        { label: 'Margin', value: `${profitPreview.margin}%` },
                      ].map(item => (
                        <div key={item.label}>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</p>
                          <p style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace', color: profitPreview.profitPerPiece >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {form.brand && form.model && form.part_type && (
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>PRODUCT</p>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {form.brand} {form.model} {form.part_type}
                    {form.quantity && <span style={{ color: 'var(--accent-green)', marginLeft: '8px', fontSize: '14px' }}>× {form.quantity} pcs</span>}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowAddModal(false); setForm(emptyForm); setModelSearch('') }}
                  style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={addProduct} disabled={saving || !isFormValid}
                  style={{ flex: 2, padding: '12px', backgroundColor: isFormValid ? 'var(--accent-green-dim)' : 'var(--bg-hover)', border: `1px solid ${isFormValid ? 'var(--accent-green)' : 'var(--border)'}`, borderRadius: '8px', color: isFormValid ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '14px', fontWeight: '600', cursor: isFormValid ? 'pointer' : 'not-allowed' }}>
                  {saving ? 'Saving...' : '✓ Add to Inventory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-blue)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>EDIT</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Edit Product</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '24px' }}>{selectedProduct.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <select value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} style={inputStyle}>
                  <option value="">Select brand</option>
                  {uniqueBrands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                <input type="text" value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Part Type</label>
                <select value={editForm.part_type} onChange={(e) => setEditForm({ ...editForm, part_type: e.target.value })} style={inputStyle}>
                  <option value="">Select part</option>
                  {partTypes.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Buy Price</label>
                  <input type="number" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sell Price</label>
                  <input type="number" value={editForm.selling_price} onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setShowEditModal(false); setSelectedProduct(null) }}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={updateProduct} disabled={saving}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '8px', color: 'var(--accent-blue)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-red)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Delete Product?</h2>
            <p style={{ fontSize: '13px', color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>{selectedProduct.name}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowDeleteConfirm(false); setSelectedProduct(null) }}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteProduct} disabled={deleting}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sold Modal */}
      {showSoldModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>SALE</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Record Sale</h2>
            <p style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '24px', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedProduct.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" placeholder="How many pieces?" value={soldData.quantity}
                  onChange={(e) => setSoldData({ ...soldData, quantity: e.target.value })} style={inputStyle} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>Available: {selectedProduct.quantity} pcs</p>
              </div>
              <div>
                <label style={labelStyle}>Selling Price (Rs.)</label>
                <input type="number" placeholder="Enter selling price..." value={soldData.selling_price}
                  onChange={(e) => setSoldData({ ...soldData, selling_price: e.target.value })} style={inputStyle} />
              </div>
              {soldData.quantity && soldData.selling_price && (
                <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                    <p style={{ color: 'var(--accent-green)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Rs.{(parseInt(soldData.quantity) * parseFloat(soldData.selling_price)).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>PROFIT</p>
                    <p style={{ color: 'var(--accent-yellow)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Rs.{((parseFloat(soldData.selling_price) - selectedProduct.purchase_price) * parseInt(soldData.quantity)).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setShowSoldModal(false); setSelectedProduct(null) }}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={markAsSold} disabled={saving}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Confirm Sale ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: block !important; }
          .stock-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}