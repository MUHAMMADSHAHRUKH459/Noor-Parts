'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'bot'
  text: string
  action?: PendingAction
  invoice?: InvoiceData
}

interface PendingAction {
  type: 'inventory' | 'sale' | 'confirm_product' | 'delete_product' | 'delete_sale'
  data: InventoryData | SaleData | ConfirmData | DeleteProductData | DeleteSaleData
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
  brand: string
  model: string
  part_type: string
  quantity: number
  selling_price: number
  product_id?: string
}

interface DeleteProductData {
  brand: string
  model: string
  part_type: string
}

interface DeleteSaleData {
  brand: string
  model: string
  part_type: string
  sale_id?: string
}

interface ConfirmData {
  products: ProductRow[]
  original_intent: 'inventory' | 'sale'
  quantity: number
  price: number
  selling_price?: number
}

interface ProductRow {
  id: string
  name: string
  brand: string
  model: string
  part_type: string
  quantity: number
  purchase_price: number
  selling_price: number
}

interface SaleRow {
  id: string
  product_id: string
  quantity: number
  selling_price: number
  total_amount: number
  sold_at: string
  product?: ProductRow
}

interface InvoiceData {
  product_name: string
  sales: InvoiceSale[]
  grand_total: number
  total_qty: number
}

interface InvoiceSale {
  date: string
  quantity: number
  selling_price: number
  total: number
}

interface AIResult {
  intent: 'inventory' | 'sale' | 'invoice' | 'query' | 'chat' | 'delete_product' | 'delete_sale'
  brand?: string
  model?: string
  part_type?: string
  quantity?: number
  purchase_price?: number
  selling_price?: number
  message: string
}

interface SpeechRecognitionEvent {
  results: { 0: { 0: { transcript: string } } }
}

interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

// ─── ID Counter ───────────────────────────────────────────────────────────────

let msgCounter = 0
function nextId(): string {
  msgCounter += 1
  return `msg_${msgCounter}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NISAB_VALUE = 87.48 * 21000
const ZAKAT_RATE = 0.025

// ─── Live Data ────────────────────────────────────────────────────────────────

function needsLiveData(message: string): boolean {
  const keywords = ['stock', 'kitna', 'bacha', 'baki', 'zakat', 'profit', 'revenue',
    'aaj', 'today', 'kamai', 'total', 'available', 'khatam', 'low',
    'inventory', 'value', 'kitne', 'check', 'batao', 'list']
  return keywords.some(k => message.toLowerCase().includes(k))
}

async function fetchLiveContext(): Promise<string> {
  try {
    const [{ data: products }, { data: sales }] = await Promise.all([
      supabase.from('products').select('*').order('quantity', { ascending: true }),
      supabase.from('sales')
        .select('*, product:products(name, brand, purchase_price)')
        .order('sold_at', { ascending: false }).limit(50),
    ])
    const pl = (products as ProductRow[]) || []
    const sl = (sales as {
      total_amount?: number; quantity?: number; sold_at: string
      product?: { purchase_price?: number }
    }[]) || []

    const totalInventoryValue = pl.reduce((s, p) => s + (p.purchase_price || 0) * (p.quantity || 0), 0)
    const zakatApplicable = totalInventoryValue >= NISAB_VALUE
    const zakatAmount = zakatApplicable ? totalInventoryValue * ZAKAT_RATE : 0
    const totalRevenue = sl.reduce((s, x) => s + (x.total_amount || 0), 0)
    const totalCost = sl.reduce((s, x) => s + (x.product?.purchase_price || 0) * (x.quantity || 0), 0)
    const todayCount = sl.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString()).length
    const outOfStock = pl.filter(p => p.quantity === 0).map(p => p.name).join(', ') || 'Koi nahi'
    const lowStock = pl.filter(p => p.quantity > 0 && p.quantity <= 5).map(p => `${p.name}(${p.quantity})`).join(', ') || 'Koi nahi'
    const allProducts = pl.map(p => `${p.name}: ${p.quantity}pcs buy=Rs${p.purchase_price} sell=Rs${p.selling_price}`).join('\n')

    return `=== LIVE SHOP DATA ===
INVENTORY: ${pl.length} products, Value=Rs${totalInventoryValue.toLocaleString()}
SALES: ${sl.length} total, Revenue=Rs${totalRevenue.toLocaleString()}, Profit=Rs${(totalRevenue - totalCost).toLocaleString()}
TODAY: ${todayCount} sales
ZAKAT: ${zakatApplicable ? 'Wajib' : 'Nahi'}, Amount=Rs${zakatAmount.toLocaleString()}
OUT OF STOCK: ${outOfStock}
LOW STOCK: ${lowStock}
ALL PRODUCTS:\n${allProducts}
=== END ===`
  } catch { return '' }
}

// ─── Invoice Generator ────────────────────────────────────────────────────────

function generateInvoicePDF(invoice: InvoiceData): void {
  const rows = invoice.sales.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#333">${s.date}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#333;text-align:center">${s.quantity} pcs</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#333;text-align:right">Rs.${s.selling_price.toLocaleString()}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:700;color:#1a1a1a;text-align:right">Rs.${s.total.toLocaleString()}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice - ${invoice.product_name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333}.page{max-width:700px;margin:0 auto;padding:40px}@media print{.no-print{display:none}.page{padding:20px}}</style>
</head><body><div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111">
    <div><h1 style="font-size:28px;font-weight:900;color:#111;letter-spacing:-1px">Noor Parts</h1><p style="font-size:13px;color:#888;margin-top:4px">Mobile Parts Shop</p></div>
    <div style="text-align:right"><p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Invoice</p><p style="font-size:13px;color:#333;margin-top:4px">${new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
  </div>
  <div style="background:#f4f4f4;border-radius:10px;padding:16px 20px;margin-bottom:28px">
    <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Product</p>
    <p style="font-size:20px;font-weight:700;color:#111">${invoice.product_name}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead><tr style="background:#111">
      <th style="padding:12px 14px;text-align:left;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px">Date</th>
      <th style="padding:12px 14px;text-align:center;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px">Qty</th>
      <th style="padding:12px 14px;text-align:right;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px">Price/pc</th>
      <th style="padding:12px 14px;text-align:right;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <div style="background:#111;color:#fff;border-radius:10px;padding:20px 28px;min-width:240px">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="font-size:13px;color:#aaa">Total Pieces</span><span style="font-size:13px;font-weight:700">${invoice.total_qty} pcs</span></div>
      <div style="border-top:1px solid #444;padding-top:12px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:14px;color:#aaa">Grand Total</span><span style="font-size:22px;font-weight:900;color:#4ade80">Rs.${invoice.grand_total.toLocaleString()}</span></div>
    </div>
  </div>
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center">
    <p style="font-size:12px;color:#aaa">Noor Parts — Mobile Parts Shop</p>
    <p style="font-size:11px;color:#ccc;margin-top:4px">Generated by Noor Parts AI</p>
  </div>
  <div class="no-print" style="margin-top:24px;text-align:center">
    <button onclick="window.print()" style="padding:12px 32px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-right:10px">🖨 Print / Save PDF</button>
    <button onclick="window.close()" style="padding:12px 32px;background:#f4f4f4;color:#333;border:none;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
  </div>
</div></body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ─── Fetch Invoice Data ───────────────────────────────────────────────────────

async function fetchInvoiceData(brand: string, model: string, partType: string): Promise<InvoiceData | null> {
  try {
    let query = supabase.from('products').select('*')
    if (brand) query = query.ilike('brand', `%${brand}%`)
    if (model) query = query.ilike('model', `%${model}%`)
    if (partType) query = query.ilike('part_type', `%${partType}%`)
    const { data: products } = await query
    if (!products || products.length === 0) return null
    const product = products[0] as ProductRow

    const { data: sales } = await supabase.from('sales').select('*')
      .eq('product_id', product.id).order('sold_at', { ascending: false })
    if (!sales || sales.length === 0) return null

    const invoiceSales: InvoiceSale[] = (sales as {
      sold_at: string; quantity: number; selling_price: number; total_amount: number
    }[]).map(s => ({
      date: new Date(s.sold_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }),
      quantity: s.quantity,
      selling_price: s.selling_price,
      total: s.total_amount,
    }))

    return {
      product_name: product.name,
      sales: invoiceSales,
      grand_total: invoiceSales.reduce((s, x) => s + x.total, 0),
      total_qty: invoiceSales.reduce((s, x) => s + x.quantity, 0),
    }
  } catch { return null }
}

// ─── Product Matcher ──────────────────────────────────────────────────────────

async function findMatchingProducts(partType: string, brand?: string, model?: string): Promise<ProductRow[]> {
  let query = supabase.from('products').select('*')
  if (brand) query = query.ilike('brand', `%${brand}%`)
  if (model) query = query.ilike('model', `%${model}%`)
  if (partType) query = query.ilike('part_type', `%${partType}%`)
  const { data } = await query.gt('quantity', 0)
  return (data as ProductRow[]) || []
}

async function findAnyProducts(brand?: string, model?: string, partType?: string): Promise<ProductRow[]> {
  let query = supabase.from('products').select('*')
  if (brand) query = query.ilike('brand', `%${brand}%`)
  if (model) query = query.ilike('model', `%${model}%`)
  if (partType) query = query.ilike('part_type', `%${partType}%`)
  const { data } = await query
  return (data as ProductRow[]) || []
}

// ─── Delete Actions ───────────────────────────────────────────────────────────

async function deleteProduct(data: DeleteProductData): Promise<string> {
  const products = await findAnyProducts(data.brand, data.model, data.part_type)
  if (products.length === 0) return `✗ "${data.brand} ${data.model} ${data.part_type}" nahi mila inventory mein.`

  const product = products[0]
  // Also delete related sales first
  await supabase.from('sales').delete().eq('product_id', product.id)
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw error

  return `✓ Delete ho gaya!\n📦 ${product.name}\nInventory aur us ki saari sales bhi hata di gayi hain.`
}

async function deleteLastSale(data: DeleteSaleData): Promise<string> {
  // Find product first
  const products = await findAnyProducts(data.brand, data.model, data.part_type)
  if (products.length === 0) return `✗ Product nahi mila.`

  const product = products[0]

  // Get last sale of this product
  const { data: sales } = await supabase.from('sales').select('*')
    .eq('product_id', product.id)
    .order('sold_at', { ascending: false })
    .limit(1)

  if (!sales || sales.length === 0) return `✗ ${product.name} ki koi sale record nahi mili.`

  const lastSale = sales[0] as SaleRow

  // Restore stock
  const { data: prod } = await supabase.from('products').select('quantity').eq('id', product.id).single()
  if (prod) {
    await supabase.from('products')
      .update({ quantity: (prod as { quantity: number }).quantity + lastSale.quantity })
      .eq('id', product.id)
  }

  // Delete sale
  const { error } = await supabase.from('sales').delete().eq('id', lastSale.id)
  if (error) throw error

  return `✓ Last sale delete ho gayi!\n📦 ${product.name}\n🔢 ${lastSale.quantity} pcs — Rs.${lastSale.total_amount?.toLocaleString()}\n📦 Stock wapas aa gaya.`
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for a Pakistani mobile parts shop "Noor Parts".
Shopkeepers talk casually in Roman Urdu or English. Understand casual language and respond helpfully.

CASUAL PATTERNS:
- "100 back cover 500 mein liye" = inventory
- "50 hot 10 ka back cover 800 mein sale kiye" = sale
- "hot 10 back cover delete karo / hata do / remove karo" = delete_product
- "hot 10 back cover ki last sale delete karo / sale wapas karo" = delete_sale
- "hot 10 back cover ki invoice" = invoice
- "total profit kitna hai" = query

Part type mappings:
- back cover/back glass/peeche ka cover = Back Glass
- screen/display/lcd = Display
- battery/batt = Battery
- speaker/awaz = Speaker
- charging port/pin = Charging Port
- fingerprint/finger = Fingerprint
- camera lens/camera = Camera Lens
- power button/on button = Power Button
- volume button = Volume Button
- ribbon/flex = Ribbon
- sim tray/sim slot = Sim Tray

IMPORTANT: Respond ONLY with valid JSON. No text before or after. No markdown.

inventory: {"intent":"inventory","brand":"","model":"","part_type":"","quantity":0,"purchase_price":0,"selling_price":0,"message":"Roman Urdu"}
sale: {"intent":"sale","brand":"","model":"","part_type":"","quantity":0,"selling_price":0,"message":"Roman Urdu"}
delete_product: {"intent":"delete_product","brand":"","model":"","part_type":"","message":"Roman Urdu — confirm karna hai"}
delete_sale: {"intent":"delete_sale","brand":"","model":"","part_type":"","message":"Roman Urdu — last sale delete hogi"}
invoice: {"intent":"invoice","brand":"","model":"","part_type":"","message":"Roman Urdu"}
query: {"intent":"query","message":"Detailed Roman Urdu answer using live data"}
chat: {"intent":"chat","message":"Roman Urdu"}

Rules:
- brand/model can be "" if not mentioned
- part_type MUST be mapped to standard name
- quantity and prices must be numbers
- message always in Roman Urdu
- delete_product: product aur us ki saari sales delete hongi — message mein warn karo
- delete_sale: sirf last sale delete hogi, stock wapas aayega`

// ─── Call AI ──────────────────────────────────────────────────────────────────

async function callAI(userMessage: string, history: Message[]): Promise<AIResult> {
  const historyText = history.slice(-4)
    .map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.text.slice(0, 100)}`).join('\n')

  const liveData = needsLiveData(userMessage) ? await fetchLiveContext() : ''

  const prompt = `${SYSTEM_PROMPT}
${liveData ? `\nLIVE DATA:\n${liveData}\n` : ''}
${historyText ? `HISTORY:\n${historyText}\n` : ''}
User says: "${userMessage}"
JSON:`

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data = await response.json()
  const text = (data.choices?.[0]?.message?.content as string) || '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid JSON')
  return JSON.parse(jsonMatch[0]) as AIResult
}

// ─── Supabase: Save Inventory ─────────────────────────────────────────────────

async function saveInventory(data: InventoryData): Promise<string> {
  const productName = `${data.brand} ${data.model} ${data.part_type}`.trim()
  const { data: existing } = await supabase.from('products').select('*')
    .eq('brand', data.brand).eq('model', data.model).eq('part_type', data.part_type).single()
  const ex = existing as ProductRow | null

  if (ex) {
    const { error } = await supabase.from('products').update({
      quantity: ex.quantity + data.quantity,
      purchase_price: data.purchase_price || ex.purchase_price,
      selling_price: data.selling_price || ex.selling_price,
    }).eq('id', ex.id)
    if (error) throw error
    return `✓ ${productName}\n${data.quantity} piece add ho gaye. Total: ${ex.quantity + data.quantity} pcs`
  } else {
    const { error } = await supabase.from('products').insert([{
      name: productName, brand: data.brand, model: data.model, part_type: data.part_type,
      quantity: data.quantity, purchase_price: data.purchase_price,
      selling_price: data.selling_price || 0, category_id: null,
    }])
    if (error) throw error
    return `✓ Naya product add!\n📦 ${productName}\n🔢 ${data.quantity} pcs @ Rs.${data.purchase_price}`
  }
}

// ─── Supabase: Save Sale ──────────────────────────────────────────────────────

async function saveSale(data: SaleData): Promise<string> {
  let product: ProductRow | null = null

  if (data.product_id) {
    const { data: p } = await supabase.from('products').select('*').eq('id', data.product_id).single()
    product = p as ProductRow | null
  } else {
    const { data: found } = await supabase.from('products').select('*')
      .ilike('brand', `%${data.brand}%`).ilike('model', `%${data.model}%`)
      .ilike('part_type', data.part_type).gt('quantity', 0)
    product = (found as ProductRow[])?.[0] || null

    if (!product) {
      const { data: broad } = await supabase.from('products').select('*')
        .ilike('part_type', `%${data.part_type}%`).gt('quantity', 0)
      product = (broad as ProductRow[])?.[0] || null
    }
  }

  if (!product) return `✗ Product nahi mila ya stock khatam. Pehle inventory mein add karein.`
  if (product.quantity < data.quantity) return `✗ Sirf ${product.quantity} pcs available hain.`

  const total_amount = data.quantity * data.selling_price
  const { error: saleErr } = await supabase.from('sales').insert([{
    product_id: product.id, quantity: data.quantity,
    selling_price: data.selling_price, total_amount,
  }])
  if (saleErr) throw saleErr
  await supabase.from('products').update({ quantity: product.quantity - data.quantity }).eq('id', product.id)
  return `✓ Sale record ho gaya!\n📦 ${product.name}\n🔢 ${data.quantity} pcs @ Rs.${data.selling_price}\n💰 Total: Rs.${total_amount.toLocaleString()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [{
  id: 'msg_0',
  role: 'bot',
  text: 'Assalam o Alaikum! Main Noor Parts ka AI assistant hun. 🤖\n\nAap mujhse aise baat kar sakte hain:\n\n📦 "100 back cover 500 mein liye"\n💸 "50 hot 10 ka back cover 800 mein sale kiye"\n🗑 "Hot 10 back cover delete karo"\n🗑 "Hot 10 back cover ki last sale delete karo"\n🧾 "Hot 10 back cover ki invoice banao"\n📊 "Total profit kitna hai?"\n🕌 "Zakat kitni banti hai?"',
}]

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ action: PendingAction; botMsgId: string } | null>(null)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = useCallback((msg: Omit<Message, 'id'>): string => {
    const id = nextId()
    setMessages(prev => [...prev, { ...msg, id }])
    return id
  }, [])

  // ── Voice ─────────────────────────────────────────────────────────────────

  function startVoice() {
    const SpeechRecognitionClass = (
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
    )
    if (!SpeechRecognitionClass) {
      addMessage({ role: 'bot', text: '⚠ Voice ke liye Chrome browser use karein.' })
      return
    }
    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      handleSendText(transcript)
    }
    recognition.start()
    recognitionRef.current = recognition
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    await handleSendText(text)
  }

  async function handleSendText(text: string) {
    if (!text.trim() || loading || sendingRef.current) return
    sendingRef.current = true
    setLoading(true)
    addMessage({ role: 'user', text })

    try {
      const result = await callAI(text, messages)

      // ── Invoice ──
      if (result.intent === 'invoice') {
        addMessage({ role: 'bot', text: result.message || 'Invoice bana raha hun...' })
        const invoiceData = await fetchInvoiceData(result.brand || '', result.model || '', result.part_type || '')
        if (!invoiceData) {
          addMessage({ role: 'bot', text: '✗ Is product ki koi sale nahi mili.' })
        } else {
          addMessage({
            role: 'bot',
            text: `✓ Invoice ready!\n📦 ${invoiceData.product_name}\n🔢 ${invoiceData.total_qty} pcs\n💰 Grand Total: Rs.${invoiceData.grand_total.toLocaleString()}`,
            invoice: invoiceData,
          })
        }

      // ── Delete Product ──
      } else if (result.intent === 'delete_product') {
        const action: PendingAction = {
          type: 'delete_product',
          data: { brand: result.brand || '', model: result.model || '', part_type: result.part_type || '' } as DeleteProductData,
        }
        const msgId = addMessage({
          role: 'bot',
          text: `${result.message}\n\n⚠ Confirm karein? Yeh product aur us ki saari sales hamesha ke liye delete ho jayengi.`,
          action,
        })
        setPendingAction({ action, botMsgId: msgId })

      // ── Delete Sale ──
      } else if (result.intent === 'delete_sale') {
        const action: PendingAction = {
          type: 'delete_sale',
          data: { brand: result.brand || '', model: result.model || '', part_type: result.part_type || '' } as DeleteSaleData,
        }
        const msgId = addMessage({
          role: 'bot',
          text: `${result.message}\n\nConfirm karein? Last sale delete hogi aur stock wapas aa jayega.`,
          action,
        })
        setPendingAction({ action, botMsgId: msgId })

      // ── Inventory ──
      } else if (result.intent === 'inventory') {
        const hasBrandModel = result.brand && result.model
        if (!hasBrandModel && result.part_type) {
          const matches = await findMatchingProducts(result.part_type, result.brand, result.model)
          if (matches.length === 1) {
            const action: PendingAction = {
              type: 'inventory',
              data: { brand: matches[0].brand, model: matches[0].model, part_type: result.part_type, quantity: result.quantity || 0, purchase_price: result.purchase_price || 0, selling_price: result.selling_price || 0 } as InventoryData,
            }
            const msgId = addMessage({ role: 'bot', text: `${result.message}\n\n🔍 Match: ${matches[0].name}\nConfirm karein?`, action })
            setPendingAction({ action, botMsgId: msgId })
          } else if (matches.length > 1) {
            const list = matches.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (${p.quantity} pcs)`).join('\n')
            const action: PendingAction = {
              type: 'confirm_product',
              data: { products: matches.slice(0, 5), original_intent: 'inventory', quantity: result.quantity || 0, price: result.purchase_price || 0, selling_price: result.selling_price || 0 } as ConfirmData,
            }
            const msgId = addMessage({ role: 'bot', text: `Konsa product? Button dabayein:\n\n${list}`, action })
            setPendingAction({ action, botMsgId: msgId })
          } else {
            const action: PendingAction = {
              type: 'inventory',
              data: { brand: result.brand || '', model: result.model || '', part_type: result.part_type, quantity: result.quantity || 0, purchase_price: result.purchase_price || 0, selling_price: result.selling_price || 0 } as InventoryData,
            }
            const msgId = addMessage({ role: 'bot', text: result.message, action })
            setPendingAction({ action, botMsgId: msgId })
          }
        } else {
          const action: PendingAction = {
            type: 'inventory',
            data: { brand: result.brand || '', model: result.model || '', part_type: result.part_type || '', quantity: result.quantity || 0, purchase_price: result.purchase_price || 0, selling_price: result.selling_price || 0 } as InventoryData,
          }
          const msgId = addMessage({ role: 'bot', text: result.message, action })
          setPendingAction({ action, botMsgId: msgId })
        }

      // ── Sale ──
      } else if (result.intent === 'sale') {
        const hasBrandModel = result.brand && result.model
        if (!hasBrandModel && result.part_type) {
          const matches = await findMatchingProducts(result.part_type, result.brand, result.model)
          if (matches.length === 1) {
            const action: PendingAction = {
              type: 'sale',
              data: { brand: matches[0].brand, model: matches[0].model, part_type: result.part_type, quantity: result.quantity || 0, selling_price: result.selling_price || 0, product_id: matches[0].id } as SaleData,
            }
            const msgId = addMessage({ role: 'bot', text: `${result.message}\n\n🔍 Match: ${matches[0].name} (${matches[0].quantity} pcs)\nConfirm karein?`, action })
            setPendingAction({ action, botMsgId: msgId })
          } else if (matches.length > 1) {
            const list = matches.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (${p.quantity} pcs)`).join('\n')
            const action: PendingAction = {
              type: 'confirm_product',
              data: { products: matches.slice(0, 5), original_intent: 'sale', quantity: result.quantity || 0, price: result.selling_price || 0 } as ConfirmData,
            }
            const msgId = addMessage({ role: 'bot', text: `Konsa product? Button dabayein:\n\n${list}`, action })
            setPendingAction({ action, botMsgId: msgId })
          } else {
            addMessage({ role: 'bot', text: `✗ "${result.part_type}" stock mein nahi mila. Pehle inventory mein add karein.` })
          }
        } else {
          const action: PendingAction = {
            type: 'sale',
            data: { brand: result.brand || '', model: result.model || '', part_type: result.part_type || '', quantity: result.quantity || 0, selling_price: result.selling_price || 0 } as SaleData,
          }
          const msgId = addMessage({ role: 'bot', text: result.message, action })
          setPendingAction({ action, botMsgId: msgId })
        }

      } else {
        addMessage({ role: 'bot', text: result.message })
      }

    } catch (err) {
      console.error(err)
      addMessage({ role: 'bot', text: 'Kuch error aa gayi. Dobara try karein.' })
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!pendingAction) return
    setLoading(true)
    const action = pendingAction.action
    setPendingAction(null)
    try {
      let msg = ''
      if (action.type === 'inventory') msg = await saveInventory(action.data as InventoryData)
      else if (action.type === 'sale') msg = await saveSale(action.data as SaleData)
      else if (action.type === 'delete_product') msg = await deleteProduct(action.data as DeleteProductData)
      else if (action.type === 'delete_sale') msg = await deleteLastSale(action.data as DeleteSaleData)
      addMessage({ role: 'bot', text: msg })
    } catch {
      addMessage({ role: 'bot', text: 'Error aa gayi. Dobara try karein.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleProductSelection(index: number) {
    if (!pendingAction || pendingAction.action.type !== 'confirm_product') return
    const confirmData = pendingAction.action.data as ConfirmData
    const selected = confirmData.products[index]
    if (!selected) return
    setPendingAction(null)
    setLoading(true)
    try {
      let msg = ''
      if (confirmData.original_intent === 'inventory') {
        msg = await saveInventory({ brand: selected.brand, model: selected.model, part_type: selected.part_type, quantity: confirmData.quantity, purchase_price: confirmData.price, selling_price: confirmData.selling_price || 0 })
      } else {
        msg = await saveSale({ brand: selected.brand, model: selected.model, part_type: selected.part_type, quantity: confirmData.quantity, selling_price: confirmData.price, product_id: selected.id })
      }
      addMessage({ role: 'bot', text: msg })
    } catch {
      addMessage({ role: 'bot', text: 'Error aa gayi. Dobara try karein.' })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setPendingAction(null)
    addMessage({ role: 'bot', text: 'Cancel kar diya. Kuch aur batayein?' })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const quickQueries = [
    { label: '📦 Stock', text: 'Konse products ka stock kam ya khatam hai?' },
    { label: '💰 Aaj ki Sale', text: 'Aaj ki total sale kitni hai?' },
    { label: '🕌 Zakat', text: 'Meri zakat kitni banti hai?' },
    { label: '📊 Profit', text: 'Total profit kitna hai?' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <button onClick={() => setIsOpen(o => !o)} style={{
        position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px',
        borderRadius: '50%', backgroundColor: isOpen ? 'var(--accent-red)' : 'var(--accent-green)',
        border: 'none', cursor: 'pointer', fontSize: '22px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'all 0.2s',
      }}>
        {isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px', width: '400px',
          maxWidth: 'calc(100vw - 32px)', height: '600px', maxHeight: 'calc(100vh - 120px)',
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          zIndex: 999, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Noor Parts AI</p>
              <p style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: isListening ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {isListening ? '🔴 Sun raha hun...' : loading ? 'Soch raha hun...' : 'Online • Live Data'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  backgroundColor: msg.role === 'user' ? 'var(--accent-green-dim)' : 'var(--bg-secondary)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--accent-green)' : 'var(--border)'}`,
                  color: msg.role === 'user' ? 'var(--accent-green)' : 'var(--text-primary)',
                  fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                }}>{msg.text}</div>

                {/* Invoice button */}
                {msg.invoice && (
                  <button onClick={() => { if (msg.invoice) generateInvoicePDF(msg.invoice) }} style={{
                    marginTop: '8px', padding: '8px 18px',
                    backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
                    borderRadius: '8px', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  }}>🖨 Invoice Open / PDF Download</button>
                )}

                {/* Confirm / Cancel — for inventory, sale, delete */}
                {msg.action && pendingAction?.botMsgId === msg.id && msg.action.type !== 'confirm_product' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={handleConfirm} style={{
                      padding: '7px 16px',
                      backgroundColor: msg.action.type === 'delete_product' || msg.action.type === 'delete_sale'
                        ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)',
                      border: `1px solid ${msg.action.type === 'delete_product' || msg.action.type === 'delete_sale'
                        ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                      borderRadius: '8px',
                      color: msg.action.type === 'delete_product' || msg.action.type === 'delete_sale'
                        ? 'var(--accent-red)' : 'var(--accent-green)',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}>
                      {msg.action.type === 'delete_product' || msg.action.type === 'delete_sale' ? '🗑 Delete Karo' : '✓ Confirm'}
                    </button>
                    <button onClick={handleCancel} style={{ padding: '7px 16px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}

                {/* Product selection */}
                {msg.action?.type === 'confirm_product' && pendingAction?.botMsgId === msg.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', width: '88%' }}>
                    {(pendingAction.action.data as ConfirmData).products.map((p: ProductRow, i: number) => (
                      <button key={p.id} onClick={() => handleProductSelection(i)}
                        style={{ padding: '8px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      >{i + 1}. {p.name} ({p.quantity} pcs)</button>
                    ))}
                    <button onClick={handleCancel} style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', animation: `bounce 1s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Buttons */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {quickQueries.map(q => (
                <button key={q.label} onClick={() => setInput(q.text)} style={{ padding: '5px 10px', fontSize: '11px', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', color: 'var(--text-secondary)' }}>{q.label}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={isListening ? stopVoice : startVoice} title="Voice input" style={{
              width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: isListening ? 'var(--accent-red-dim)' : 'var(--bg-primary)',
              border: `1px solid ${isListening ? 'var(--accent-red)' : 'var(--border)'}`,
              cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{isListening ? '⏹' : '🎤'}</button>

            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Sun raha hun...' : 'Type ya mic dabao...'}
              disabled={loading || isListening}
              style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', opacity: loading || isListening ? 0.6 : 1 }}
            />
            <button onClick={handleSend} disabled={loading || !input.trim() || isListening} style={{
              padding: '10px 14px', backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)',
              borderRadius: '8px', color: 'var(--accent-green)', fontSize: '16px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}>↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </>
  )
}