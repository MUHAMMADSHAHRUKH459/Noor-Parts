'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Sale, Product } from '@/types'
import VoiceInput, { SaleVoiceData } from '@/components/voice/VoiceInput'

// ─── Brand / Model Data ───────────────────────────────────────────────────────

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

const allPartTypes = [
  { name: 'Back Glass', icon: '🔲' },
  { name: 'Display', icon: '📺' },
  { name: 'Fingerprint', icon: '👆' },
  { name: 'Battery', icon: '🔋' },
  { name: 'Power Button', icon: '⏻' },
  { name: 'Volume Button', icon: '🔊' },
  { name: 'Speaker', icon: '🔉' },
  { name: 'Ribbon', icon: '🎗️' },
  { name: 'Charging Port', icon: '🔌' },
  { name: 'Camera Lens', icon: '📷' },
  { name: 'Sim Tray', icon: '💳' },
  { name: 'Other', icon: '🔧' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

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

type SaleMode = 'stock' | 'new'
type Step = 'brand' | 'model' | 'part' | 'details'

const emptyNew = { purchase_price: '', selling_price: '', stock_qty: '', sale_qty: '', sale_price: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Flow state
  const [mode, setMode] = useState<SaleMode>('stock')
  const [step, setStep] = useState<Step>('brand')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [selectedPart, setSelectedPart] = useState('')
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null)

  // Stock mode details
  const [quantity, setQuantity] = useState('1')
  const [sellingPrice, setSellingPrice] = useState('')

  // New product mode details
  const [newForm, setNewForm] = useState(emptyNew)

  // Modals
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<{ name: string; qty: string; price: string; total: number; profit: number } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [deleting, setDeleting] = useState(false)

  // History
  const [historySearch, setHistorySearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [{ data: salesData }, { data: productsData }] = await Promise.all([
        supabase.from('sales').select('*, product:products(*)').order('sold_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
      ])
      setSales(salesData || [])
      setProducts(productsData || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

  const todaySales = useMemo(() =>
    sales.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString()), [sales])
  const todayRevenue = useMemo(() => todaySales.reduce((s, x) => s + (x.total_amount || 0), 0), [todaySales])
  const todayProfit = useMemo(() => todaySales.reduce((s, x) =>
    s + ((x.selling_price - (x.product?.purchase_price || 0)) * x.quantity), 0), [todaySales])
  const totalRevenue = useMemo(() => sales.reduce((s, x) => s + (x.total_amount || 0), 0), [sales])

  // Models for selected brand
  const brandModels = useMemo(() => {
    const b = brandData.find(b => b.name === selectedBrand)
    if (!b) return []
    if (!modelSearch) return b.models
    return b.models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))
  }, [selectedBrand, modelSearch])

  // Parts available in stock for selected brand+model
  const stockPartsForModel = useMemo(() => {
    if (!selectedBrand || !selectedModel) return []
    return products.filter(p =>
      p.brand?.toLowerCase() === selectedBrand.toLowerCase() &&
      p.model?.toLowerCase() === selectedModel.toLowerCase() &&
      p.quantity > 0
    )
  }, [products, selectedBrand, selectedModel])

  // All part types (for new product mode)
  const filteredHistory = useMemo(() =>
    sales.filter(s =>
      s.product?.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
      s.product?.brand?.toLowerCase().includes(historySearch.toLowerCase())
    ), [sales, historySearch])

  // Receipt total
  const total = mode === 'stock'
    ? (parseFloat(sellingPrice) || 0) * (parseInt(quantity) || 0)
    : (parseFloat(newForm.sale_price) || 0) * (parseInt(newForm.sale_qty) || 0)

  const profit = mode === 'stock' && matchedProduct
    ? ((parseFloat(sellingPrice) || 0) - (matchedProduct.purchase_price || 0)) * (parseInt(quantity) || 0)
    : (parseFloat(newForm.sale_price) - parseFloat(newForm.purchase_price) || 0) * (parseInt(newForm.sale_qty) || 0)

  // ── Step navigation ──────────────────────────────────────────────────────────

  function resetFlow() {
    setStep('brand')
    setSelectedBrand('')
    setSelectedModel('')
    setModelSearch('')
    setSelectedPart('')
    setMatchedProduct(null)
    setQuantity('1')
    setSellingPrice('')
    setNewForm(emptyNew)
  }

  function selectBrand(brand: string) {
    setSelectedBrand(brand)
    setSelectedModel('')
    setModelSearch('')
    setSelectedPart('')
    setMatchedProduct(null)
    setStep('model')
  }

  function selectModel(model: string) {
    setSelectedModel(model)
    setModelSearch('')
    setSelectedPart('')
    setMatchedProduct(null)
    setStep('part')
  }

  function selectPart(partName: string) {
    setSelectedPart(partName)
    if (mode === 'stock') {
      const found = products.find(p =>
        p.brand?.toLowerCase() === selectedBrand.toLowerCase() &&
        p.model?.toLowerCase() === selectedModel.toLowerCase() &&
        p.part_type?.toLowerCase() === partName.toLowerCase() &&
        p.quantity > 0
      )
      setMatchedProduct(found || null)
      setSellingPrice(found?.selling_price?.toString() || '')
      setQuantity('1')
    }
    setStep('details')
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleStockSell() {
    if (!matchedProduct || !quantity || !sellingPrice) return
    const qty = parseInt(quantity)
    const price = parseFloat(sellingPrice)
    if (qty > matchedProduct.quantity) return
    setSaving(true)
    try {
      await supabase.from('sales').insert([{
        product_id: matchedProduct.id, quantity: qty,
        selling_price: price, total_amount: qty * price,
      }])
      await supabase.from('products').update({ quantity: matchedProduct.quantity - qty }).eq('id', matchedProduct.id)
      setLastSale({ name: matchedProduct.name, qty: quantity, price: sellingPrice, total: qty * price, profit })
      setShowReceipt(true)
      await loadData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleNewProductSell() {
    const { purchase_price, selling_price, stock_qty, sale_qty, sale_price } = newForm
    if (!selectedBrand || !selectedModel || !selectedPart || !sale_qty || !sale_price) return
    setSaving(true)
    try {
      const productName = `${selectedBrand} ${selectedModel} ${selectedPart}`
      const totalStock = parseInt(stock_qty) || 0
      const saleQty = parseInt(sale_qty)
      const salePrice = parseFloat(sale_price)
      const remaining = Math.max(0, totalStock - saleQty)

      // Check if product exists
      const { data: existing } = await supabase.from('products').select('*')
        .eq('brand', selectedBrand).eq('model', selectedModel).eq('part_type', selectedPart).single()

      let productId = ''
      if (existing) {
        await supabase.from('products').update({
          quantity: existing.quantity + remaining,
          purchase_price: parseFloat(purchase_price) || existing.purchase_price,
          selling_price: parseFloat(selling_price) || existing.selling_price,
        }).eq('id', existing.id)
        productId = existing.id
      } else {
        const { data: newProd } = await supabase.from('products').insert([{
          name: productName, brand: selectedBrand, model: selectedModel, part_type: selectedPart,
          purchase_price: parseFloat(purchase_price) || 0,
          selling_price: parseFloat(selling_price) || 0,
          quantity: remaining, category_id: null,
        }]).select()
        productId = newProd?.[0]?.id
      }

      await supabase.from('sales').insert([{
        product_id: productId, quantity: saleQty,
        selling_price: salePrice, total_amount: saleQty * salePrice,
      }])

      const saleProfit = (salePrice - (parseFloat(purchase_price) || 0)) * saleQty
      setLastSale({ name: productName, qty: sale_qty, price: sale_price, total: saleQty * salePrice, profit: saleProfit })
      setShowReceipt(true)
      await loadData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function deleteSale() {
    if (!selectedSale) return
    setDeleting(true)
    try {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', selectedSale.product_id).single()
      if (prod) await supabase.from('products').update({ quantity: prod.quantity + selectedSale.quantity }).eq('id', selectedSale.product_id)
      await supabase.from('sales').delete().eq('id', selectedSale.id)
      setShowDeleteModal(false); setSelectedSale(null)
      await loadData()
    } catch (err) { console.error(err) }
    finally { setDeleting(false) }
  }

  function handleReceiptClose() {
    setShowReceipt(false)
    setLastSale(null)
    resetFlow()
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--accent-green)' }}>◎</div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>Loading...</p>
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>Records</p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Sales</h1>
        </div>
        <VoiceInput
          mode="sale"
          onInventoryResult={() => {}}
          onSaleResult={(data: Partial<SaleVoiceData>) => {
            const detected = products.find(p =>
              data.product_name && (
                p.name.toLowerCase().includes(data.product_name.toLowerCase()) ||
                p.brand.toLowerCase().includes(data.product_name.toLowerCase())
              )
            )
            if (detected) {
              setSelectedBrand(detected.brand)
              setSelectedModel(detected.model)
              setSelectedPart(detected.part_type)
              setMatchedProduct(detected)
              setSellingPrice(data.selling_price || detected.selling_price?.toString() || '')
              setQuantity(data.quantity || '1')
              setMode('stock')
              setStep('details')
            }
          }}
        />
      </div>

      {/* ── Today's Summary ─────────────────────────────────────────────────── */}
      <div className="sales-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Aaj ki Sales', value: todaySales.length.toString(), accent: 'var(--accent-blue)', icon: '▣' },
          { label: 'Aaj ki Revenue', value: `Rs.${todayRevenue.toLocaleString()}`, accent: 'var(--accent-green)', icon: '◈' },
          { label: 'Aaj ka Profit', value: `Rs.${todayProfit.toLocaleString()}`, accent: todayProfit >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)', icon: '◉' },
          { label: 'Total Revenue', value: `Rs.${totalRevenue.toLocaleString()}`, accent: 'var(--accent-purple)', icon: '◎' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{card.label}</p>
              <span style={{ color: card.accent, fontSize: '14px' }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: card.accent, fontFamily: 'IBM Plex Mono, monospace' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────────── */}
      <div className="sell-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* ── Sale Form Panel ──────────────────────────────────────────────── */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>

          {/* Panel Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Sale Record Karo</p>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => { setMode('stock'); resetFlow() }} style={{
                padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                backgroundColor: mode === 'stock' ? 'var(--accent-green-dim)' : 'transparent',
                border: `1px solid ${mode === 'stock' ? 'var(--accent-green)' : 'var(--border)'}`,
                color: mode === 'stock' ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>◈ Stock mein hai</button>
              <button onClick={() => { setMode('new'); resetFlow() }} style={{
                padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                backgroundColor: mode === 'new' ? 'var(--accent-blue-dim)' : 'transparent',
                border: `1px solid ${mode === 'new' ? 'var(--accent-blue)' : 'var(--border)'}`,
                color: mode === 'new' ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}>+ Naya Product</button>
            </div>
          </div>

          <div style={{ padding: '22px' }}>

            {/* ── Breadcrumb ─────────────────────────────────────────────── */}
            {(selectedBrand || selectedModel || selectedPart) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
                {selectedBrand && (
                  <button onClick={() => { setStep('brand'); setSelectedModel(''); setSelectedPart(''); setMatchedProduct(null) }}
                    style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                    {selectedBrand} ✕
                  </button>
                )}
                {selectedModel && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>
                    <button onClick={() => { setStep('model'); setSelectedPart(''); setMatchedProduct(null) }}
                      style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                      {selectedModel} ✕
                    </button>
                  </>
                )}
                {selectedPart && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>
                    <button onClick={() => { setStep('part'); setSelectedPart(''); setMatchedProduct(null) }}
                      style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                      {selectedPart} ✕
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ══ STEP 1: Brand ════════════════════════════════════════════ */}
            {step === 'brand' && (
              <div>
                <label style={labelStyle}>1 — Brand Select Karo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {brandData.map(b => (
                    <button key={b.name} onClick={() => selectBrand(b.name)} style={{
                      padding: '10px 6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                      backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontSize: '11px', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{b.icon}</div>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ STEP 2: Model ════════════════════════════════════════════ */}
            {step === 'model' && selectedBrand && (
              <div>
                <label style={labelStyle}>2 — Model Select Karo ({selectedBrand})</label>
                <input type="text" placeholder="Search model..." value={modelSearch}
                  onChange={e => setModelSearch(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '12px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {brandModels.map(m => (
                    <button key={m} onClick={() => selectModel(m)} style={{
                      padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                      backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >{m}</button>
                  ))}
                  {/* Custom model input */}
                  {modelSearch && !brandModels.includes(modelSearch) && (
                    <button onClick={() => selectModel(modelSearch)} style={{
                      padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                      backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
                      color: 'var(--accent-blue)',
                    }}>+ &quot;{modelSearch}&quot; add karo</button>
                  )}
                </div>
              </div>
            )}

            {/* ══ STEP 3: Part Type ════════════════════════════════════════ */}
            {step === 'part' && selectedModel && (
              <div>
                <label style={labelStyle}>3 — Part Type Select Karo</label>

                {/* Stock mode: show only available parts */}
                {mode === 'stock' && (
                  <>
                    {stockPartsForModel.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--accent-yellow-dim)', border: '1px solid var(--accent-yellow)', borderRadius: '10px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--accent-yellow)', marginBottom: '8px' }}>⚠ {selectedBrand} {selectedModel} ka koi part stock mein nahi</p>
                        <button onClick={() => setMode('new')} style={{
                          padding: '8px 16px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
                          borderRadius: '8px', color: 'var(--accent-blue)', fontSize: '13px', cursor: 'pointer',
                        }}>+ Naya Product add karo</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stockPartsForModel.map(p => (
                          <button key={p.id} onClick={() => selectPart(p.part_type)} style={{
                            padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                            backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.backgroundColor = 'var(--accent-green-dim)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-primary)' }}
                          >
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                {allPartTypes.find(pt => pt.name === p.part_type)?.icon} {p.part_type}
                              </p>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                                Buy: Rs.{p.purchase_price?.toLocaleString()} • Sell: Rs.{p.selling_price?.toLocaleString()}
                              </p>
                            </div>
                            <span style={{
                              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                              fontFamily: 'IBM Plex Mono, monospace',
                              backgroundColor: p.quantity > 10 ? 'var(--accent-green-dim)' : 'var(--accent-yellow-dim)',
                              color: p.quantity > 10 ? 'var(--accent-green)' : 'var(--accent-yellow)',
                              border: `1px solid ${p.quantity > 10 ? 'var(--accent-green)' : 'var(--accent-yellow)'}`,
                            }}>{p.quantity} pcs</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* New product mode: show all part types */}
                {mode === 'new' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {allPartTypes.map(pt => (
                      <button key={pt.name} onClick={() => selectPart(pt.name)} style={{
                        padding: '12px 8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', fontSize: '12px', transition: 'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{pt.icon}</div>
                        {pt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 4: Details ══════════════════════════════════════════ */}
            {step === 'details' && (
              <div>
                {/* ── Stock mode details ─────────────────────────────────── */}
                {mode === 'stock' && matchedProduct && (
                  <div>
                    {/* Product info */}
                    <div style={{
                      padding: '12px 16px', marginBottom: '18px',
                      backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)',
                      borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-green)' }}>{matchedProduct.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{matchedProduct.quantity} pcs available</p>
                      </div>
                      <span style={{ fontSize: '20px' }}>✓</span>
                    </div>

                    <label style={labelStyle}>4 — Quantity aur Price</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Quantity</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => setQuantity(q => Math.max(1, parseInt(q) - 1).toString())} style={{
                            width: '34px', height: '34px', borderRadius: '6px', border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer',
                          }}>−</button>
                          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                            min="1" max={matchedProduct.quantity}
                            style={{ ...inputStyle, textAlign: 'center', padding: '8px 4px' }} />
                          <button onClick={() => setQuantity(q => Math.min(matchedProduct.quantity, parseInt(q) + 1).toString())} style={{
                            width: '34px', height: '34px', borderRadius: '6px', border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer',
                          }}>+</button>
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>Max: {matchedProduct.quantity}</p>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Selling Price (Rs.)</label>
                        <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} style={inputStyle} />
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Default: Rs.{matchedProduct.selling_price?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Receipt preview */}
                    {sellingPrice && quantity && (
                      <div style={{
                        padding: '14px 16px', marginBottom: '16px',
                        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px',
                      }}>
                        <p style={{ ...labelStyle, marginBottom: '10px' }}>Receipt Preview</p>
                        {[
                          { label: `${quantity} × Rs.${sellingPrice}`, value: `Rs.${total.toLocaleString()}` },
                          { label: 'Profit', value: `+Rs.${profit.toLocaleString()}` },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.label}</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {parseInt(quantity) > matchedProduct.quantity && (
                      <p style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        ✕ Sirf {matchedProduct.quantity} pcs available hain
                      </p>
                    )}

                    <button onClick={handleStockSell}
                      disabled={!quantity || !sellingPrice || saving || parseInt(quantity) > matchedProduct.quantity}
                      style={{
                        width: '100%', padding: '13px',
                        backgroundColor: quantity && sellingPrice ? 'var(--accent-green-dim)' : 'var(--bg-hover)',
                        border: `1px solid ${quantity && sellingPrice ? 'var(--accent-green)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        color: quantity && sellingPrice ? 'var(--accent-green)' : 'var(--text-muted)',
                        fontSize: '14px', fontWeight: '700',
                        cursor: quantity && sellingPrice ? 'pointer' : 'not-allowed',
                      }}>
                      {saving ? 'Saving...' : '✓ Sale Record Karo'}
                    </button>
                  </div>
                )}

                {/* ── No stock match warning ─────────────────────────────── */}
                {mode === 'stock' && !matchedProduct && (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--accent-red)', marginBottom: '8px' }}>
                      {selectedBrand} {selectedModel} {selectedPart} stock mein nahi hai
                    </p>
                    <button onClick={() => setMode('new')} style={{
                      padding: '8px 16px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
                      borderRadius: '8px', color: 'var(--accent-blue)', fontSize: '13px', cursor: 'pointer',
                    }}>+ Naya Product mode mein switch karo</button>
                  </div>
                )}

                {/* ── New product details ────────────────────────────────── */}
                {mode === 'new' && (
                  <div>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>
                        📦 {selectedBrand} {selectedModel} {selectedPart} — inventory mein add ho jayega
                      </p>
                    </div>

                    <label style={labelStyle}>4 — Pricing Details</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Purchase Price (Rs.)</label>
                        <input type="number" placeholder="Khareed price"
                          value={newForm.purchase_price} onChange={e => setNewForm(f => ({ ...f, purchase_price: e.target.value }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Default Sell Price (Rs.)</label>
                        <input type="number" placeholder="Default sell price"
                          value={newForm.selling_price} onChange={e => setNewForm(f => ({ ...f, selling_price: e.target.value }))}
                          style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ ...labelStyle, fontSize: '10px' }}>Total Stock Received (optional)</label>
                      <input type="number" placeholder="Agar aur bhi laye hain to likho"
                        value={newForm.stock_qty} onChange={e => setNewForm(f => ({ ...f, stock_qty: e.target.value }))}
                        style={inputStyle} />
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0 16px' }} />
                    <p style={{ fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '12px' }}>Sale Details</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Bechne ki Quantity</label>
                        <input type="number" placeholder="Kitne piece"
                          value={newForm.sale_qty} onChange={e => setNewForm(f => ({ ...f, sale_qty: e.target.value }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Sale Price (Rs.)</label>
                        <input type="number" placeholder="Aaj ka rate"
                          value={newForm.sale_price} onChange={e => setNewForm(f => ({ ...f, sale_price: e.target.value }))}
                          style={inputStyle} />
                      </div>
                    </div>

                    {newForm.sale_qty && newForm.sale_price && (
                      <div style={{ padding: '14px 16px', marginBottom: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total</span>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{total.toLocaleString()}</span>
                        </div>
                        {newForm.purchase_price && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Profit</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>+Rs.{profit.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={handleNewProductSell}
                      disabled={!newForm.sale_qty || !newForm.sale_price || saving}
                      style={{
                        width: '100%', padding: '13px',
                        backgroundColor: newForm.sale_qty && newForm.sale_price ? 'var(--accent-blue-dim)' : 'var(--bg-hover)',
                        border: `1px solid ${newForm.sale_qty && newForm.sale_price ? 'var(--accent-blue)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        color: newForm.sale_qty && newForm.sale_price ? 'var(--accent-blue)' : 'var(--text-muted)',
                        fontSize: '14px', fontWeight: '700',
                        cursor: newForm.sale_qty && newForm.sale_price ? 'pointer' : 'not-allowed',
                      }}>
                      {saving ? 'Saving...' : '✓ Add & Sell'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Today's Sales Panel ──────────────────────────────────────────── */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📅</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Aaj ki Sales</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{todaySales.length} transactions</p>
              </div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', fontFamily: 'IBM Plex Mono, monospace', backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)' }}>
              +Rs.{todayProfit.toLocaleString()} profit
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '480px' }}>
            {todaySales.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>◈</div>
                <p style={{ fontSize: '13px' }}>Aaj abhi koi sale nahi</p>
              </div>
            ) : todaySales.map((sale, i) => {
              const sp = (sale.selling_price - (sale.product?.purchase_price || 0)) * sale.quantity
              return (
                <div key={sale.id} style={{ padding: '14px 20px', borderBottom: i < todaySales.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{sale.product?.name || 'N/A'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{sale.quantity} pcs × Rs.{sale.selling_price?.toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '10px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.total_amount?.toLocaleString()}</p>
                    <p style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>+Rs.{sp.toLocaleString()}</p>
                  </div>
                  <button onClick={() => { setSelectedSale(sale); setShowDeleteModal(true) }} style={{ padding: '5px 8px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Sales History ────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Poori Sales History</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{sales.length} total transactions</p>
            </div>
          </div>
          <input type="text" placeholder="Search history..." value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            style={{ ...inputStyle, width: '220px', padding: '8px 14px', fontSize: '13px' }} />
        </div>

        <div className="desktop-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Product', 'Brand', 'Qty', 'Price', 'Total', 'Profit', 'Date', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Koi sale nahi mili</td></tr>
              ) : filteredHistory.map((sale, i) => {
                const sp = (sale.selling_price - (sale.product?.purchase_price || 0)) * sale.quantity
                return (
                  <tr key={sale.id} style={{ borderBottom: i < filteredHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' }}>{sale.product?.name || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{sale.product?.brand || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>{sale.quantity} pcs</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.selling_price?.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ color: 'var(--accent-green)', fontWeight: '600', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.total_amount?.toLocaleString()}</span></td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '13px', color: sp >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)', fontWeight: '600', fontFamily: 'IBM Plex Mono, monospace' }}>{sp >= 0 ? '+' : ''}Rs.{sp.toLocaleString()}</span></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{new Date(sale.sold_at).toLocaleDateString('en-PK')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => { setSelectedSale(sale); setShowDeleteModal(true) }} style={{ padding: '5px 10px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="mobile-cards" style={{ display: 'none' }}>
          {filteredHistory.map(sale => {
            const sp = (sale.selling_price - (sale.product?.purchase_price || 0)) * sale.quantity
            return (
              <div key={sale.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{sale.product?.name || 'N/A'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sale.product?.brand} • {new Date(sale.sold_at).toLocaleDateString('en-PK')}</p>
                  </div>
                  <button onClick={() => { setSelectedSale(sale); setShowDeleteModal(true) }} style={{ padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Total</p><p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>Rs.{sale.total_amount?.toLocaleString()}</p></div>
                  <div><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Profit</p><p style={{ fontSize: '13px', color: 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>+Rs.{sp.toLocaleString()}</p></div>
                  <div><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Qty</p><p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>{sale.quantity} pcs</p></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Success Receipt Modal ──────────────────────────────────────────── */}
      {showReceipt && lastSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-green)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px', backgroundColor: 'var(--accent-green-dim)', border: '2px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>✓</div>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>SALE COMPLETE</p>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>{lastSale.name}</h2>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              {[
                { label: 'Quantity', value: `${lastSale.qty} pcs` },
                { label: 'Price', value: `Rs.${parseFloat(lastSale.price).toLocaleString()}` },
                { label: 'Total', value: `Rs.${lastSale.total.toLocaleString()}` },
                { label: 'Profit', value: `+Rs.${lastSale.profit.toLocaleString()}` },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <button onClick={handleReceiptClose} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '10px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Agle Sale ke liye ↩
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteModal && selectedSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-red)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>DELETE</p>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Sale Delete Karein?</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Stock wapas inventory mein aa jayega.</p>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--accent-red-dim)', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--accent-red)', fontSize: '14px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>{selectedSale.product?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedSale.quantity} pcs — Rs.{selectedSale.total_amount?.toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowDeleteModal(false); setSelectedSale(null) }} style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteSale} disabled={deleting} style={{ flex: 1, padding: '11px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Delete ✕'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sell-grid { grid-template-columns: 1fr !important; }
          .sales-stats { grid-template-columns: 1fr 1fr !important; }
          .desktop-table { display: none; }
          .mobile-cards { display: block !important; }
        }
      `}</style>
    </div>
  )
}