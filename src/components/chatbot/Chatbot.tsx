'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'bot'
  text: string
  action?: PendingAction
}

interface PendingAction {
  type: 'inventory' | 'sale'
  data: InventoryData | SaleData
}

interface InventoryData {
  brand: string
  model: string
  part_type: string
  quantity: number
  purchase_price: number
  selling_price: number
}

interface SaleData {
  product_name: string
  brand: string
  model: string
  part_type: string
  quantity: number
  selling_price: number
}

// ─── Zakat Constants ──────────────────────────────────────────────────────────

const NISAB_GOLD_GRAMS = 87.48
const GOLD_PRICE_PER_GRAM_PKR = 21000
const NISAB_VALUE = NISAB_GOLD_GRAMS * GOLD_PRICE_PER_GRAM_PKR
const ZAKAT_RATE = 0.025

// ─── Live Data Fetcher ────────────────────────────────────────────────────────

async function fetchLiveContext(): Promise<string> {
  try {
    const [{ data: products }, { data: sales }] = await Promise.all([
      supabase.from('products').select('*').order('quantity', { ascending: true }),
      supabase.from('sales')
        .select('*, product:products(name, brand, purchase_price)')
        .order('sold_at', { ascending: false })
        .limit(50),
    ])

    const productList = products || []
    const salesList = sales || []

    const totalInventoryValue = productList.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0)
    const zakatApplicable = totalInventoryValue >= NISAB_VALUE
    const zakatAmount = zakatApplicable ? totalInventoryValue * ZAKAT_RATE : 0

    const totalRevenue = salesList.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const totalCost = salesList.reduce((sum, s) => sum + ((s.product?.purchase_price || 0) * (s.quantity || 0)), 0)
    const totalProfit = totalRevenue - totalCost

    const todaySales = salesList.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0)

    const outOfStock = productList.filter(p => p.quantity === 0).map(p => p.name).join(', ') || 'Koi nahi'
    const lowStock = productList.filter(p => p.quantity > 0 && p.quantity <= 5).map(p => `${p.name}(${p.quantity})`).join(', ') || 'Koi nahi'

    const allProducts = productList
      .map(p => `${p.name}: ${p.quantity}pcs buy=Rs${p.purchase_price} sell=Rs${p.selling_price}`)
      .join('\n')

    return `=== LIVE SHOP DATA ===
INVENTORY: ${productList.length} products, Value=Rs${totalInventoryValue.toLocaleString()}
SALES: ${salesList.length} total, Revenue=Rs${totalRevenue.toLocaleString()}, Profit=Rs${totalProfit.toLocaleString()}
TODAY: ${todaySales.length} sales, Rs${todayRevenue.toLocaleString()}
ZAKAT: ${zakatApplicable ? 'Wajib' : 'Nahi'}, Amount=Rs${zakatAmount.toLocaleString()}
OUT OF STOCK: ${outOfStock}
LOW STOCK: ${lowStock}
ALL PRODUCTS:
${allProducts}
=== END ===`
  } catch (err) {
    console.error('Context fetch error:', err)
    return ''
  }
}

// ─── Check if query needs live data ──────────────────────────────────────────

function needsLiveData(message: string): boolean {
  const keywords = [
    'stock', 'kitna', 'bacha', 'baki', 'zakat', 'profit', 'revenue',
    'sale', 'aaj', 'today', 'analytics', 'report', 'kamai', 'total',
    'available', 'khatam', 'low', 'out', 'inventory', 'value', 'kitne',
    'brand', 'product', 'check', 'batao', 'dekho', 'list',
  ]
  const lower = message.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for a Pakistani mobile parts shop called "Noor Parts".
You help with inventory, sales, stock queries, zakat, and analytics in Roman Urdu or English.

Valid brands: Infinix, Techno, Oppo, Vivo, SparkX, Realme, Redmi, Xiaomi, Google Pixel, iPhone, Samsung, Nokia, Huawei, Itel, Honor, OnePlus
Valid part types: Back Glass, Fingerprint, Power Button, Volume Button, Ribbon, Display, Battery, Speaker, Charging Port, Sim Tray, Camera Lens

Respond ONLY with valid JSON. No markdown, no explanation.

ADD inventory:
{"intent":"inventory","brand":"","model":"","part_type":"","quantity":0,"purchase_price":0,"selling_price":0,"message":"Roman Urdu confirmation"}

RECORD sale:
{"intent":"sale","brand":"","model":"","part_type":"","quantity":0,"selling_price":0,"message":"Roman Urdu confirmation"}

QUERY (stock/zakat/sales/analytics question):
{"intent":"query","message":"Roman Urdu answer using live data"}

CHAT (general):
{"intent":"chat","message":"Roman Urdu response"}

Rules:
- "purchase kiya/liya/stock aaya/add karo/manga liya" = inventory
- "becha/sell kiya/sale/gaya" = sale
- "kitna/stock/zakat/profit/aaj/revenue/khatam/available/batao" = query
- Always extract brand, model, part_type separately
- Prices and quantities must be numbers
- message always in Roman Urdu`

// ─── Call OpenRouter ──────────────────────────────────────────────────────────

async function callAI(userMessage: string, conversationHistory: Message[]) {
  const historyText = conversationHistory
    .slice(-4)
    .map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.text}`)
    .join('\n')

  // Only fetch live data when needed — saves tokens
  const liveData = needsLiveData(userMessage) ? await fetchLiveContext() : ''

  const prompt = `${SYSTEM_PROMPT}
${liveData ? `\n${liveData}\n` : ''}
${historyText ? `Previous:\n${historyText}\n` : ''}
User: ${userMessage}
JSON:`

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('API error:', response.status, errBody)
    throw new Error(`API error: ${response.status}`)
  }

  const data = await response.json()

  // OpenRouter format: data.choices[0].message.content
  const text = data.choices?.[0]?.message?.content || '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Supabase: Save Inventory ─────────────────────────────────────────────────

async function saveInventory(data: InventoryData): Promise<string> {
  const productName = `${data.brand} ${data.model} ${data.part_type}`

  const { data: existing } = await supabase
    .from('products').select('*')
    .eq('brand', data.brand).eq('model', data.model).eq('part_type', data.part_type)
    .single()

  if (existing) {
    const { error } = await supabase.from('products').update({
      quantity: existing.quantity + data.quantity,
      purchase_price: data.purchase_price || existing.purchase_price,
      selling_price: data.selling_price || existing.selling_price,
    }).eq('id', existing.id)
    if (error) { console.error(error); throw error }
    return `✓ ${productName}\n${data.quantity} piece add ho gaye. Total: ${existing.quantity + data.quantity} pcs`
  } else {
    const { error } = await supabase.from('products').insert([{
      name: productName,
      brand: data.brand, model: data.model, part_type: data.part_type,
      quantity: data.quantity,
      purchase_price: data.purchase_price,
      selling_price: data.selling_price || 0,
      category_id: null,
    }])
    if (error) { console.error(error); throw error }
    return `✓ Naya product add!\n📦 ${productName}\n🔢 ${data.quantity} pcs @ Rs.${data.purchase_price}`
  }
}

// ─── Supabase: Save Sale ──────────────────────────────────────────────────────

async function saveSale(data: SaleData): Promise<string> {
  const { data: products } = await supabase.from('products').select('*')
    .ilike('brand', data.brand)
    .ilike('model', `%${data.model}%`)
    .ilike('part_type', data.part_type)
    .gt('quantity', 0)

  let product = products?.[0]

  if (!product) {
    const { data: broad } = await supabase.from('products').select('*')
      .ilike('brand', `%${data.brand}%`)
      .ilike('model', `%${data.model}%`)
      .gt('quantity', 0)
    product = broad?.[0]
  }

  if (!product) return `✗ "${data.brand} ${data.model} ${data.part_type}" nahi mila ya stock khatam.\nPehle inventory mein add karein.`
  if (product.quantity < data.quantity) return `✗ Sirf ${product.quantity} pcs available hain, ${data.quantity} nahi bech sakte.`

  const total_amount = data.quantity * data.selling_price

  const { error: saleErr } = await supabase.from('sales').insert([{
    product_id: product.id, quantity: data.quantity,
    selling_price: data.selling_price, total_amount,
  }])
  if (saleErr) { console.error(saleErr); throw saleErr }

  const { error: updateErr } = await supabase.from('products')
    .update({ quantity: product.quantity - data.quantity }).eq('id', product.id)
  if (updateErr) { console.error(updateErr); throw updateErr }

  return `✓ Sale record ho gaya!\n📦 ${product.name}\n🔢 ${data.quantity} pcs @ Rs.${data.selling_price}\n💰 Total: Rs.${total_amount.toLocaleString()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    id: '1', role: 'bot',
    text: 'Assalam o Alaikum! Main Noor Parts ka AI assistant hun.\n\n📦 Stock check: "Infinix Hot 10 ka back glass kitna bacha?"\n💰 Sale: "Oppo A15 display 2 piece 2200 mein becha"\n➕ Inventory: "Samsung A54 battery 10 piece 800 mein aayi"\n🕌 Zakat: "Meri zakat kitni banti hai?"\n📊 Analytics: "Aaj ki total sale batao"',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ action: PendingAction; botMsgId: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(msg: Omit<Message, 'id'>) {
    const newMsg = { ...msg, id: Date.now().toString() }
    setMessages(prev => [...prev, newMsg])
    return newMsg.id
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    addMessage({ role: 'user', text })
    setLoading(true)

    try {
      const result = await callAI(text, messages)

      if (result.intent === 'inventory') {
        const action: PendingAction = {
          type: 'inventory',
          data: {
            brand: result.brand, model: result.model, part_type: result.part_type,
            quantity: result.quantity, purchase_price: result.purchase_price,
            selling_price: result.selling_price || 0,
          } as InventoryData,
        }
        const msgId = addMessage({ role: 'bot', text: result.message, action })
        setPendingAction({ action, botMsgId: msgId })

      } else if (result.intent === 'sale') {
        const action: PendingAction = {
          type: 'sale',
          data: {
            product_name: `${result.brand} ${result.model} ${result.part_type}`,
            brand: result.brand, model: result.model, part_type: result.part_type,
            quantity: result.quantity, selling_price: result.selling_price,
          } as SaleData,
        }
        const msgId = addMessage({ role: 'bot', text: result.message, action })
        setPendingAction({ action, botMsgId: msgId })

      } else {
        addMessage({ role: 'bot', text: result.message })
      }
    } catch (err) {
      console.error(err)
      addMessage({ role: 'bot', text: 'Kuch error aa gayi. Thodi der baad dobara try karein.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return
    setLoading(true)
    setPendingAction(null)
    try {
      let msg = ''
      if (pendingAction.action.type === 'inventory') {
        msg = await saveInventory(pendingAction.action.data as InventoryData)
      } else {
        msg = await saveSale(pendingAction.action.data as SaleData)
      }
      addMessage({ role: 'bot', text: msg })
    } catch {
      addMessage({ role: 'bot', text: 'Save karne mein error. Console check karein.' })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setPendingAction(null)
    addMessage({ role: 'bot', text: 'Cancel kar diya. Kuch aur batayein?' })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const quickQueries = [
    { label: '📦 Stock', text: 'Konse products ka stock kam ya khatam hai?' },
    { label: '💰 Aaj', text: 'Aaj ki total sale kitni hai?' },
    { label: '🕌 Zakat', text: 'Meri zakat kitni banti hai?' },
    { label: '📊 Profit', text: 'Total profit kitna hai?' },
  ]

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} style={{
        position: 'fixed', bottom: '24px', right: '24px',
        width: '56px', height: '56px', borderRadius: '50%',
        backgroundColor: isOpen ? 'var(--accent-red)' : 'var(--accent-green)',
        border: 'none', cursor: 'pointer', fontSize: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'all 0.2s',
      }}>
        {isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px',
          width: '400px', maxWidth: 'calc(100vw - 32px)',
          height: '580px', maxHeight: 'calc(100vh - 120px)',
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          zIndex: 999, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Noor Parts AI</p>
              <p style={{ fontSize: '11px', color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {loading ? 'Soch raha hun...' : 'Online • Live Data'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  backgroundColor: msg.role === 'user' ? 'var(--accent-green-dim)' : 'var(--bg-secondary)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--accent-green)' : 'var(--border)'}`,
                  color: msg.role === 'user' ? 'var(--accent-green)' : 'var(--text-primary)',
                  fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>

                {msg.action && pendingAction?.botMsgId === msg.id && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={handleConfirm} style={{
                      padding: '7px 16px', backgroundColor: 'var(--accent-green-dim)',
                      border: '1px solid var(--accent-green)', borderRadius: '8px',
                      color: 'var(--accent-green)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}>✓ Confirm</button>
                    <button onClick={handleCancel} style={{
                      padding: '7px 16px', backgroundColor: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '8px',
                      color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                    }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  display: 'flex', gap: '4px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: 'var(--accent-green)',
                      animation: `bounce 1s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Buttons */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {quickQueries.map(q => (
                <button key={q.label} onClick={() => setInput(q.text)} style={{
                  padding: '5px 10px', fontSize: '11px', cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: '20px', color: 'var(--text-secondary)',
                }}>
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)', display: 'flex', gap: '8px',
          }}>
            <input
              type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stock poochein, sale add karein..."
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px',
                backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)',
                fontSize: '13px', outline: 'none', opacity: loading ? 0.6 : 1,
              }}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()} style={{
              padding: '10px 14px', backgroundColor: 'var(--accent-green-dim)',
              border: '1px solid var(--accent-green)', borderRadius: '8px',
              color: 'var(--accent-green)', fontSize: '16px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1, transition: 'all 0.15s',
            }}>↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}