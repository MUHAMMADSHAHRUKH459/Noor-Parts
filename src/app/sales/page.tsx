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

const brands = ['Infinix', 'Techno', 'Oppo', 'Vivo', 'SparkX', 'Realme', 'Redmi', 'Google Pixel', 'iPhone', 'Samsung']
const partTypes = ['Back Glass', 'Fingerprint', 'Power Button', 'Ribbon', 'Display', 'Battery', 'Speaker', 'Other']

type SaleMode = 'existing' | 'new'

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saving, setSaving] = useState(false)
  const [saleMode, setSaleMode] = useState<SaleMode>('existing')

  const [existingSale, setExistingSale] = useState({
    product_id: '', quantity: '', selling_price: '',
  })

  const [newProductSale, setNewProductSale] = useState({
    brand: '', model: '', part_type: '',
    purchase_price: '', selling_price: '', quantity: '', sale_quantity: '', sale_price: '',
  })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [{ data: salesData }, { data: productsData }] = await Promise.all([
          supabase.from('sales').select('*, product:products(*)').order('sold_at', { ascending: false }),
          supabase.from('products').select('*').order('name'),
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
      supabase.from('products').select('*').order('name'),
    ])
    setSales(salesData || [])
    setProducts(productsData || [])
    setTotalRevenue(salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0)
  }

  async function addExistingSale() {
    if (!existingSale.product_id || !existingSale.quantity || !existingSale.selling_price) return
    setSaving(true)
    try {
      const product = products.find(p => p.id === existingSale.product_id)
      if (!product) return
      const quantity = parseInt(existingSale.quantity)
      const selling_price = parseFloat(existingSale.selling_price)
      const { error: saleError } = await supabase.from('sales').insert([{
        product_id: existingSale.product_id, quantity, selling_price,
        total_amount: quantity * selling_price,
      }])
      if (saleError) throw saleError
      const { error: updateError } = await supabase.from('products')
        .update({ quantity: product.quantity - quantity }).eq('id', product.id)
      if (updateError) throw updateError
      setShowSaleModal(false)
      setExistingSale({ product_id: '', quantity: '', selling_price: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function addNewProductSale() {
    if (!newProductSale.brand || !newProductSale.model || !newProductSale.part_type || !newProductSale.sale_quantity || !newProductSale.sale_price) return
    setSaving(true)
    try {
      // First add product to inventory
      const totalQty = parseInt(newProductSale.quantity) || 0
      const saleQty = parseInt(newProductSale.sale_quantity)
      const remainingQty = totalQty - saleQty

      const { data: productData, error: productError } = await supabase.from('products').insert([{
        name: `${newProductSale.brand} ${newProductSale.model} ${newProductSale.part_type}`,
        brand: newProductSale.brand, model: newProductSale.model, part_type: newProductSale.part_type,
        purchase_price: parseFloat(newProductSale.purchase_price) || 0,
        selling_price: parseFloat(newProductSale.selling_price) || 0,
        quantity: remainingQty >= 0 ? remainingQty : 0,
        category_id: null,
      }]).select()
      if (productError) throw productError

      // Then record sale
      const selling_price = parseFloat(newProductSale.sale_price)
      const { error: saleError } = await supabase.from('sales').insert([{
        product_id: productData[0].id,
        quantity: saleQty,
        selling_price,
        total_amount: saleQty * selling_price,
      }])
      if (saleError) throw saleError

      setShowSaleModal(false)
      setNewProductSale({ brand: '', model: '', part_type: '', purchase_price: '', selling_price: '', quantity: '', sale_quantity: '', sale_price: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSale() {
    if (!selectedSale) return
    setSaving(true)
    try {
      const { data: productData } = await supabase
        .from('products').select('quantity').eq('id', selectedSale.product_id).single()

      if (productData) {
        await supabase.from('products')
          .update({ quantity: productData.quantity + selectedSale.quantity })
          .eq('id', selectedSale.product_id)
      }

      const { error } = await supabase.from('sales').delete().eq('id', selectedSale.id)
      if (error) throw error
      setShowDeleteModal(false)
      setSelectedSale(null)
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function openSaleModal() {
    setSaleMode('existing')
    setExistingSale({ product_id: '', quantity: '', selling_price: '' })
    setNewProductSale({ brand: '', model: '', part_type: '', purchase_price: '', selling_price: '', quantity: '', sale_quantity: '', sale_price: '' })
    setShowSaleModal(true)
  }

  const todaySales = sales.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
  const filteredSales = sales.filter(s =>
    s.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.product?.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const existingTotal = existingSale.quantity && existingSale.selling_price
    ? parseInt(existingSale.quantity) * parseFloat(existingSale.selling_price) : 0

  const newTotal = newProductSale.sale_quantity && newProductSale.sale_price
    ? parseInt(newProductSale.sale_quantity) * parseFloat(newProductSale.sale_price) : 0

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
              setExistingSale(prev => ({
                ...prev,
                product_id: detectedProduct ? detectedProduct.id : prev.product_id,
                quantity: data.quantity || prev.quantity,
                selling_price: data.selling_price || prev.selling_price,
              }))
              setSaleMode('existing')
              setShowSaleModal(true)
            }}
          />
          <button onClick={openSaleModal} style={{
            padding: '10px 18px', backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)', borderRadius: '8px',
            color: 'var(--accent-green)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>+ Add Sale</button>
        </div>
      </div>

      {/* Stats */}
      <div className="sales-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Total Sales', value: sales.length, format: 'number', accent: 'var(--accent-blue)' },
          { label: 'Total Revenue', value: totalRevenue, format: 'currency', accent: 'var(--accent-green)' },
          { label: "Today's Sales", value: todaySales.length, format: 'number', accent: 'var(--accent-yellow)' },
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
        <input type="text" placeholder="Search sales by product or brand..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, padding: '12px 16px' }} />
      </div>

      {/* Desktop Table */}
      <div className="desktop-table" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Brand', 'Qty', 'Price', 'Total', 'Date', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: '11px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>◈</div>
                <p style={{ fontSize: '13px' }}>No sales found</p>
              </td></tr>
            ) : filteredSales.map((sale, i) => (
              <tr key={sale.id} style={{ borderBottom: i < filteredSales.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{sale.product?.name || 'N/A'}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>{sale.product?.brand || 'N/A'}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>{sale.quantity} pcs</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.selling_price?.toLocaleString()}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: '600', fontSize: '13px' }}>Rs.{sale.total_amount?.toLocaleString()}</span>
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{new Date(sale.sold_at).toLocaleDateString('en-PK')}</td>
                <td style={{ padding: '14px 20px' }}>
                  <button onClick={() => { setSelectedSale(sale); setShowDeleteModal(true) }}
                    style={{ padding: '6px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-bright)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    ✕ Delete
                  </button>
                </td>
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
            <p style={{ fontSize: '13px' }}>No sales found</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Qty</p>
                  <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>{sale.quantity} pcs</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Price</p>
                  <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Rs.{sale.selling_price?.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedSale(sale); setShowDeleteModal(true) }}
                style={{ padding: '8px 14px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-bright)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                ✕ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sale Modal */}
      {showSaleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>SALES</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>Add Sale</h2>

            {/* Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
              <button
                onClick={() => setSaleMode('existing')}
                style={{
                  padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: saleMode === 'existing' ? 'var(--accent-green-dim)' : 'transparent',
                  border: `1px solid ${saleMode === 'existing' ? 'var(--accent-green)' : 'var(--border)'}`,
                  color: saleMode === 'existing' ? 'var(--accent-green)' : 'var(--text-muted)',
                }}>
                ◈ Existing Product
              </button>
              <button
                onClick={() => setSaleMode('new')}
                style={{
                  padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: saleMode === 'new' ? 'var(--accent-blue-dim)' : 'transparent',
                  border: `1px solid ${saleMode === 'new' ? 'var(--accent-blue)' : 'var(--border)'}`,
                  color: saleMode === 'new' ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}>
                + New Product
              </button>
            </div>

            {/* Existing Product Form */}
            {saleMode === 'existing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Select Product</label>
                  <select value={existingSale.product_id} onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value)
                    setExistingSale({ ...existingSale, product_id: e.target.value, selling_price: product ? product.selling_price.toString() : '' })
                  }} style={inputStyle}>
                    <option value="">Select a product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input type="number" placeholder="Number of pieces" value={existingSale.quantity}
                    onChange={(e) => setExistingSale({ ...existingSale, quantity: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Selling Price</label>
                  <input type="number" placeholder="Rs." value={existingSale.selling_price}
                    onChange={(e) => setExistingSale({ ...existingSale, selling_price: e.target.value })} style={inputStyle} />
                </div>
                {existingTotal > 0 && (
                  <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                    <p style={{ color: 'var(--accent-green)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{existingTotal.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* New Product Form */}
            {saleMode === 'new' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>Product will be added to inventory automatically</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Brand</label>
                    <select value={newProductSale.brand} onChange={(e) => setNewProductSale({ ...newProductSale, brand: e.target.value })} style={inputStyle}>
                      <option value="">Select brand</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Model</label>
                    <input type="text" placeholder="e.g. Hot 10, A54" value={newProductSale.model}
                      onChange={(e) => setNewProductSale({ ...newProductSale, model: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Part Type</label>
                  <select value={newProductSale.part_type} onChange={(e) => setNewProductSale({ ...newProductSale, part_type: e.target.value })} style={inputStyle}>
                    <option value="">Select part type</option>
                    {partTypes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Buy Price</label>
                    <input type="number" placeholder="Rs." value={newProductSale.purchase_price}
                      onChange={(e) => setNewProductSale({ ...newProductSale, purchase_price: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Sell Price</label>
                    <input type="number" placeholder="Rs." value={newProductSale.selling_price}
                      onChange={(e) => setNewProductSale({ ...newProductSale, selling_price: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Total Stock Received</label>
                  <input type="number" placeholder="Total pieces received" value={newProductSale.quantity}
                    onChange={(e) => setNewProductSale({ ...newProductSale, quantity: e.target.value })} style={inputStyle} />
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                <p style={{ fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>Sale Details</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Selling Qty</label>
                    <input type="number" placeholder="Pieces to sell" value={newProductSale.sale_quantity}
                      onChange={(e) => setNewProductSale({ ...newProductSale, sale_quantity: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sale Price</label>
                    <input type="number" placeholder="Rs." value={newProductSale.sale_price}
                      onChange={(e) => setNewProductSale({ ...newProductSale, sale_price: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                {newTotal > 0 && (
                  <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                    <p style={{ color: 'var(--accent-green)', fontSize: '20px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{newTotal.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowSaleModal(false)}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={saleMode === 'existing' ? addExistingSale : addNewProductSale}
                disabled={saving}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Confirm Sale ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-red)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>DELETE</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Delete Sale?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>This sale will be deleted and stock will be restored:</p>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--accent-red-dim)', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--accent-red)', fontSize: '14px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>{selectedSale.product?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedSale.quantity} pcs — Rs.{selectedSale.total_amount?.toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowDeleteModal(false); setSelectedSale(null) }}
                style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteSale} disabled={saving}
                style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Deleting...' : 'Delete ✕'}
              </button>
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