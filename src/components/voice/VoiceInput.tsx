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

// ─── Brand Data ──────────────────────────────────────────────────────────────

const brandMap: Record<string, string> = {
  'infinix': 'Infinix',
  'techno': 'Techno',
  'tecno': 'Techno',
  'oppo': 'Oppo',
  'vivo': 'Vivo',
  'sparkx': 'SparkX',
  'spark x': 'SparkX',
  'realme': 'Realme',
  'redmi': 'Redmi',
  'xiaomi': 'Xiaomi',
  'google pixel': 'Google Pixel',
  'pixel': 'Google Pixel',
  'iphone': 'iPhone',
  'apple': 'iPhone',
  'samsung': 'Samsung',
  'nokia': 'Nokia',
  'huawei': 'Huawei',
  'itel': 'Itel',
  'honor': 'Honor',
  'oneplus': 'OnePlus',
  'one plus': 'OnePlus',
}

// ─── Part Data ───────────────────────────────────────────────────────────────

// Sorted longest-first so multi-word phrases match before single words
const partMap: Record<string, string> = {
  'back glass': 'Back Glass',
  'back cover': 'Back Glass',
  'bak glass': 'Back Glass',
  'back panel': 'Back Glass',
  'peeche ka glass': 'Back Glass',
  'peechay ka glass': 'Back Glass',
  'pichla glass': 'Back Glass',
  'power button': 'Power Button',
  'volume button': 'Volume Button',
  'fingerprint': 'Fingerprint',
  'finger print': 'Fingerprint',
  'ungali sensor': 'Fingerprint',
  'ungali': 'Fingerprint',
  'display': 'Display',
  'screen': 'Display',
  'iskreen': 'Display',
  'lcd': 'Display',
  'battery': 'Battery',
  'bateri': 'Battery',
  'speaker': 'Speaker',
  'ribbon': 'Ribbon',
  'flex': 'Ribbon',
  'charging port': 'Charging Port',
  'charger port': 'Charging Port',
  'sim tray': 'Sim Tray',
  'camera lens': 'Camera Lens',
  'camera glass': 'Camera Lens',
}

// ─── Parser Helpers ───────────────────────────────────────────────────────────

function detectBrand(text: string): string {
  // Sort by length descending — "google pixel" before "pixel"
  const keys = Object.keys(brandMap).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (text.includes(key)) return brandMap[key]
  }
  return ''
}

function detectPart(text: string): string {
  const keys = Object.keys(partMap).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (text.includes(key)) return partMap[key]
  }
  return ''
}

function detectModel(text: string, brand: string): string {
  // Remove brand name from text before searching for model
  let cleaned = text
  if (brand) {
    // Remove all variations of brand
    const brandKeys = Object.entries(brandMap)
      .filter(([, v]) => v === brand)
      .map(([k]) => k)
    for (const k of brandKeys) {
      cleaned = cleaned.replace(new RegExp(k, 'gi'), '')
    }
  }

  // Model patterns — ordered most specific first
  const patterns = [
    /hot\s*\d+\s*(?:pro|plus|ultra|play|lite)?/i,
    /note\s*\d+\s*(?:pro|plus|s|ultra|turbo)?/i,
    /spark\s*\d+\s*(?:pro|plus|go|neo)?/i,
    /camon\s*\d+\s*(?:pro|premier)?/i,
    /pop\s*\d+\s*(?:pro|plus)?/i,
    /reno\s*\d+\s*(?:pro|f|z)?/i,
    /nord\s*\d+\s*(?:ce|pro|lite)?/i,
    /a\d+\s*(?:s|e|f)?(?:\s*5g)?/i,
    /f\d+\s*(?:pro)?/i,
    /y\s*\d+\s*(?:s|a)?/i,
    /v\d+\s*(?:s|pro)?/i,
    /x\d+\s*(?:pro|gt)?/i,
    /s\d+\s*(?:fe|ultra|plus|e)?(?:\s*5g)?/i,
    /\d+\s*(?:pro\s*max|pro|plus|ultra|mini|max)/i,
    /\d+[a-z]?(?:\s*5g)?/i,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const result = match[0].trim()
      // Avoid returning single digits that are likely prices/quantities
      if (/^\d+$/.test(result) && parseInt(result) < 100) continue
      return result
    }
  }
  return ''
}

/**
 * Extract a price value that comes AFTER a keyword
 * e.g. "purchase 300" → "300"
 */
function extractPriceAfter(text: string, keywords: string[]): string {
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}\\s*(?:price|rate|ka|mein|mai|pe)?\\s*(\\d+)`, 'i')
    const match = text.match(regex)
    if (match) return match[1]
  }
  return ''
}

/**
 * Extract a price value that comes BEFORE a keyword
 * e.g. "300 mein liya" → "300"
 */
function extractPriceBefore(text: string, keywords: string[]): string {
  for (const kw of keywords) {
    const regex = new RegExp(`(\\d+)\\s*(?:rupay|rs|rupees)?\\s*${kw}`, 'i')
    const match = text.match(regex)
    if (match) return match[1]
  }
  return ''
}

function extractQuantity(text: string): string {
  // "50 piece" / "50 pcs" / "50 pc"
  const match = text.match(/(\d+)\s*(?:piece|pieces|pcs|pc|peece|adad)/i)
  return match ? match[1] : ''
}

function allNumbers(text: string): number[] {
  return (text.match(/\d+/g) || []).map(Number)
}

// ─── Inventory Parser ─────────────────────────────────────────────────────────

function parseInventoryVoice(raw: string): Partial<InventoryVoiceData> {
  const text = raw.toLowerCase()

  const brand = detectBrand(text)
  const part_type = detectPart(text)
  const model = detectModel(text, brand)
  const quantity = extractQuantity(text)

  // Purchase price keywords
  const purchase_price =
    extractPriceAfter(text, ['purchase', 'khareed', 'kharida', 'liya', 'cost', 'buy', 'aya', 'aaya', 'mil']) ||
    extractPriceBefore(text, ['mein liya', 'mai liya', 'ka liya', 'mein aaya'])

  // Selling price keywords
  const selling_price =
    extractPriceAfter(text, ['sell', 'selling', 'becho', 'bechna', 'sale', 'dena', 'rakho', 'rakh']) ||
    extractPriceBefore(text, ['mein becho', 'mai becho', 'mein de', 'pe de'])

  // Fallback: if we couldn't detect prices with keywords,
  // use positional logic — smaller number = purchase, larger = selling
  if (!purchase_price || !selling_price) {
    const nums = allNumbers(text)
    // Filter out numbers likely to be quantity or model numbers
    const qty = quantity ? parseInt(quantity) : 0
    const priceNums = nums.filter(n => {
      if (n === qty) return false          // skip quantity
      if (n < 50) return false             // too small to be a price
      if (n > 100000) return false         // too large
      return true
    })

    if (priceNums.length >= 2) {
      const sorted = [...priceNums].sort((a, b) => a - b)
      return {
        brand,
        model,
        part_type,
        quantity,
        purchase_price: purchase_price || sorted[0].toString(),
        selling_price: selling_price || sorted[sorted.length - 1].toString(),
      }
    }

    if (priceNums.length === 1) {
      return {
        brand,
        model,
        part_type,
        quantity,
        purchase_price: purchase_price || priceNums[0].toString(),
        selling_price,
      }
    }
  }

  return { brand, model, part_type, quantity, purchase_price, selling_price }
}

// ─── Sale Parser ──────────────────────────────────────────────────────────────

function parseSaleVoice(raw: string): Partial<SaleVoiceData> {
  const text = raw.toLowerCase()

  const brand = detectBrand(text)
  const part_type = detectPart(text)
  const model = detectModel(text, brand)
  const product_name = [brand, model, part_type].filter(Boolean).join(' ')
  const quantity = extractQuantity(text)

  const selling_price =
    extractPriceBefore(text, ['mein becha', 'mai becha', 'mein sell', 'pe becha', 'mein diya', 'ka becha']) ||
    extractPriceAfter(text, ['sell', 'becha', 'diya', 'rate', 'price', 'rupay', 'rs']) ||
    extractPriceBefore(text, ['rupay', 'rs', 'rupees', 'mein', 'mai', 'pe'])

  // Fallback positional
  if (!selling_price) {
    const nums = allNumbers(text)
    const qty = quantity ? parseInt(quantity) : 0
    const priceNums = nums.filter(n => n !== qty && n >= 50 && n <= 100000)
    if (priceNums.length >= 1) {
      return {
        product_name,
        quantity,
        selling_price: priceNums[priceNums.length - 1].toString(),
      }
    }
  }

  return { product_name, quantity, selling_price }
}

// ─── Component ────────────────────────────────────────────────────────────────

const statusConfig = {
  idle:       { color: 'var(--accent-blue)',   label: '🎤 Voice Entry' },
  listening:  { color: 'var(--accent-red)',    label: '⏹ Sun raha hoon...' },
  processing: { color: 'var(--accent-yellow)', label: '⏳ Samajh raha hoon...' },
  done:       { color: 'var(--accent-green)',  label: '✓ Samajh gaya!' },
  error:      { color: 'var(--accent-red)',    label: '✕ Dobara try karo' },
}

type Status = keyof typeof statusConfig

const hints = {
  inventory: 'Misaal: "Infinix Hot 10 back glass 50 piece 300 purchase 500 selling"',
  sale: 'Misaal: "Oppo A15 display 2 piece 2200 mein becha"',
}

export default function VoiceInput({ mode, onInventoryResult, onSaleResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  function startListening() {
    const win = window as WindowWithSpeech
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SR) {
      alert('Aapka browser voice support nahi karta! Chrome use karein.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
      setStatus('listening')
      setTranscript('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setStatus('processing')

      if (mode === 'inventory') {
        onInventoryResult(parseInventoryVoice(text))
      } else {
        onSaleResult(parseSaleVoice(text))
      }

      setStatus('done')

      // Auto-reset after 4 seconds
      setTimeout(() => setStatus('idle'), 4000)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const { color, label } = statusConfig[status]

  return (
    <div>
      <button
        onClick={startListening}
        disabled={isListening}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          backgroundColor: `${color}20`,
          border: `1px solid ${color}`,
          borderRadius: '8px',
          color,
          fontSize: '13px',
          fontWeight: '600',
          cursor: isListening ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: isListening ? 0.7 : 1,
        }}
      >
        {label}
      </button>

      {transcript && (
        <div style={{
          marginTop: '10px',
          backgroundColor: 'var(--accent-blue-dim)',
          border: '1px solid var(--accent-blue)',
          borderRadius: '8px',
          padding: '10px 14px',
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'IBM Plex Mono, monospace',
            marginBottom: '4px',
            letterSpacing: '1px',
          }}>SUNA:</p>
          <p style={{ fontSize: '13px', color: 'var(--accent-blue)' }}>{transcript}</p>
        </div>
      )}

      {status === 'idle' && (
        <p style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginTop: '8px',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {hints[mode]}
        </p>
      )}
    </div>
  )
}