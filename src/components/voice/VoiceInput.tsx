'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryVoiceData {
  brand: string
  model: string
  part_type: string
  quantity: string
  purchase_price: string
  selling_price: string
}

export interface SaleVoiceData {
  product_name: string
  quantity: string
  selling_price: string
}

interface VoiceInputProps {
  mode: 'inventory' | 'sale'
  onInventoryResult: (data: Partial<InventoryVoiceData>) => void
  onSaleResult: (data: Partial<SaleVoiceData>) => void
}

// ─── Speech Recognition Types ────────────────────────────────────────────────

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: () => void
  onend: () => void
  start: () => void
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance
}

// ─── Gemini Parser ────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const INVENTORY_PROMPT = `You are a parser for a Pakistani mobile parts shop inventory system.
The shopkeeper speaks in Roman Urdu or English. Extract the following fields from the transcript.

Valid brands: Infinix, Techno, Oppo, Vivo, SparkX, Realme, Redmi, Xiaomi, Google Pixel, iPhone, Samsung, Nokia, Huawei, Itel, Honor, OnePlus

Valid part types: Back Glass, Fingerprint, Power Button, Volume Button, Ribbon, Display, Battery, Speaker, Charging Port, Sim Tray, Camera Lens

Rules:
- "back glass", "back cover", "peeche ka glass", "bak glass" = Back Glass
- "fingerprint", "finger", "ungali" = Fingerprint
- "power button", "power" = Power Button
- "display", "screen", "lcd", "iskreen" = Display
- "battery", "bateri" = Battery
- Numbers followed by "piece", "pcs", "pc" = quantity
- Numbers after "purchase", "khareed", "liya", "cost" = purchase_price
- Numbers after "sell", "selling", "becho", "bechna" = selling_price
- If only two prices mentioned, smaller = purchase_price, larger = selling_price

Return ONLY a JSON object, no explanation, no markdown:
{"brand":"","model":"","part_type":"","quantity":"","purchase_price":"","selling_price":""}`

const SALE_PROMPT = `You are a parser for a Pakistani mobile parts shop sales system.
The shopkeeper speaks in Roman Urdu or English. Extract sale information from the transcript.

Valid brands: Infinix, Techno, Oppo, Vivo, SparkX, Realme, Redmi, Xiaomi, Google Pixel, iPhone, Samsung, Nokia, Huawei, Itel, Honor, OnePlus

Valid part types: Back Glass, Fingerprint, Power Button, Volume Button, Ribbon, Display, Battery, Speaker, Charging Port, Sim Tray, Camera Lens

Rules:
- Combine brand + model + part to make product_name
- Numbers followed by "piece", "pcs", "pc" = quantity
- Numbers after "mein", "mai", "rupay", "rs", "becha", "sell" = selling_price
- If two numbers, smaller likely = quantity, larger = selling_price

Return ONLY a JSON object, no explanation, no markdown:
{"product_name":"","quantity":"","selling_price":""}`

async function parseWithGemini(
  transcript: string,
  mode: 'inventory' | 'sale'
): Promise<Partial<InventoryVoiceData> | Partial<SaleVoiceData>> {
  const prompt = mode === 'inventory' ? INVENTORY_PROMPT : SALE_PROMPT

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nTranscript: "${transcript}"` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      })
    }
  )

  if (!response.ok) throw new Error('Gemini API error')
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Fallback Rule-Based Parser ───────────────────────────────────────────────

const brandMap: Record<string, string> = {
  'infinix': 'Infinix', 'techno': 'Techno', 'tecno': 'Techno',
  'oppo': 'Oppo', 'vivo': 'Vivo', 'sparkx': 'SparkX',
  'realme': 'Realme', 'redmi': 'Redmi', 'xiaomi': 'Xiaomi',
  'google pixel': 'Google Pixel', 'pixel': 'Google Pixel',
  'iphone': 'iPhone', 'apple': 'iPhone', 'samsung': 'Samsung',
  'nokia': 'Nokia', 'huawei': 'Huawei', 'itel': 'Itel',
  'honor': 'Honor', 'oneplus': 'OnePlus',
}

const partMap: Record<string, string> = {
  'back glass': 'Back Glass', 'back cover': 'Back Glass', 'bak glass': 'Back Glass',
  'back panel': 'Back Glass', 'peeche ka glass': 'Back Glass',
  'power button': 'Power Button', 'fingerprint': 'Fingerprint',
  'finger print': 'Fingerprint', 'ungali': 'Fingerprint',
  'display': 'Display', 'screen': 'Display', 'lcd': 'Display',
  'battery': 'Battery', 'bateri': 'Battery', 'speaker': 'Speaker',
  'ribbon': 'Ribbon', 'flex': 'Ribbon',
}

function fallbackParse(text: string, mode: 'inventory' | 'sale') {
  const t = text.toLowerCase()
  const brandKeys = Object.keys(brandMap).sort((a, b) => b.length - a.length)
  const partKeys = Object.keys(partMap).sort((a, b) => b.length - a.length)
  const brand = brandKeys.find(k => t.includes(k)) ? brandMap[brandKeys.find(k => t.includes(k))!] : ''
  const part_type = partKeys.find(k => t.includes(k)) ? partMap[partKeys.find(k => t.includes(k))!] : ''
  const nums = (t.match(/\d+/g) || []).map(Number).filter(n => n > 0)
  const qtyMatch = t.match(/(\d+)\s*(piece|pcs|pc|peece)/i)
  const quantity = qtyMatch ? qtyMatch[1] : ''
  const priceNums = nums.filter(n => n !== (parseInt(quantity) || -1) && n >= 50)

  if (mode === 'inventory') {
    return {
      brand, part_type, quantity, model: '',
      purchase_price: priceNums.length >= 1 ? priceNums[0].toString() : '',
      selling_price: priceNums.length >= 2 ? priceNums[priceNums.length - 1].toString() : '',
    }
  }
  return {
    product_name: brand, quantity,
    selling_price: priceNums.length >= 1 ? priceNums[priceNums.length - 1].toString() : '',
  }
}

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig = {
  idle:       { color: 'var(--accent-blue)',   label: '🎤 Voice Entry' },
  listening:  { color: 'var(--accent-red)',    label: '⏹ Sun raha hoon...' },
  processing: { color: 'var(--accent-yellow)', label: '🤖 AI samajh raha hai...' },
  done:       { color: 'var(--accent-green)',  label: '✓ Samajh gaya!' },
  error:      { color: 'var(--accent-red)',    label: '✕ Dobara try karo' },
}

type Status = keyof typeof statusConfig

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceInput({ mode, onInventoryResult, onSaleResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [usingAI, setUsingAI] = useState(false)

  async function handleTranscript(text: string) {
    setStatus('processing')
    try {
      if (GEMINI_API_KEY) {
        setUsingAI(true)
        const result = await parseWithGemini(text, mode)
        if (mode === 'inventory') onInventoryResult(result as Partial<InventoryVoiceData>)
        else onSaleResult(result as Partial<SaleVoiceData>)
      } else {
        setUsingAI(false)
        const result = fallbackParse(text, mode)
        if (mode === 'inventory') onInventoryResult(result as Partial<InventoryVoiceData>)
        else onSaleResult(result as Partial<SaleVoiceData>)
      }
      setStatus('done')
    } catch (err) {
      console.error('Gemini error, using fallback:', err)
      setUsingAI(false)
      const result = fallbackParse(text, mode)
      if (mode === 'inventory') onInventoryResult(result as Partial<InventoryVoiceData>)
      else onSaleResult(result as Partial<SaleVoiceData>)
      setStatus('done')
    }
    setTimeout(() => { setStatus('idle'); setUsingAI(false) }, 4000)
  }

  function startListening() {
    const win = window as WindowWithSpeech
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) { alert('Aapka browser voice support nahi karta! Chrome use karein.'); return }

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => { setIsListening(true); setStatus('listening'); setTranscript('') }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      handleTranscript(text)
    }
    recognition.onerror = () => { setIsListening(false); setStatus('error'); setTimeout(() => setStatus('idle'), 3000) }
    recognition.onend = () => { setIsListening(false) }
    recognition.start()
  }

  const { color, label } = statusConfig[status]

  return (
    <div>
      <button
        onClick={startListening}
        disabled={isListening || status === 'processing'}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 18px',
          backgroundColor: `${color}20`,
          border: `1px solid ${color}`,
          borderRadius: '8px', color,
          fontSize: '13px', fontWeight: '600',
          cursor: (isListening || status === 'processing') ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: (isListening || status === 'processing') ? 0.7 : 1,
        }}
      >
        {label}
      </button>

      {transcript && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ backgroundColor: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px', letterSpacing: '1px' }}>SUNA:</p>
            <p style={{ fontSize: '13px', color: 'var(--accent-blue)' }}>{transcript}</p>
          </div>
          {status === 'done' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: usingAI ? 'var(--accent-green-dim)' : 'var(--accent-yellow-dim)',
              border: `1px solid ${usingAI ? 'var(--accent-green)' : 'var(--accent-yellow)'}`,
              borderRadius: '6px', padding: '4px 10px',
            }}>
              <span style={{ fontSize: '11px', color: usingAI ? 'var(--accent-green)' : 'var(--accent-yellow)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {usingAI ? '🤖 Gemini AI se parse hua' : '⚙ Rule-based parse hua'}
              </span>
            </div>
          )}
        </div>
      )}

      {status === 'idle' && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
          {mode === 'inventory'
            ? 'Misaal: "Infinix Hot 10 back glass 50 piece 300 purchase 500 selling"'
            : 'Misaal: "Oppo A15 display 2 piece 2200 mein becha"'}
        </p>
      )}
    </div>
  )
}