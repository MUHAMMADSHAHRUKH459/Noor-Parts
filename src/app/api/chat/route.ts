import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://noorparts.vercel.app',   // apni site ka URL
      'X-Title': 'Noor Parts',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',  // free model
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('OpenRouter error:', response.status, err)
    return NextResponse.json({ error: err }, { status: response.status })
  }

  const data = await response.json()
  return NextResponse.json(data)
}