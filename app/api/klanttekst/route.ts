import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { bevindingen, materialen, installatieType, klantNaam } = await req.json()

    const bevAnders = (bevindingen || []).filter((b: { beoordeling: string }) => b.beoordeling !== 'voldoet')
    const bevOk = (bevindingen || []).filter((b: { beoordeling: string }) => b.beoordeling === 'voldoet')

    const prompt = `Je bent een adviseur bij GrowGreen Energy. Schrijf een begrijpelijke, niet-technische klanttekst voor${klantNaam ? ` ${klantNaam}` : ' de klant'}.

De groepenkast is beoordeeld voor uitbreiding met een laadpaal (${installatieType === 'zakelijk' ? 'zakelijke installatie' : 'woninginstallatie'}).

Bevindingen die aandacht nodig hebben:
${bevAnders.map((b: { beschrijving: string; aanbeveling: string; prioriteit: string }) => `- ${b.beschrijving} → ${b.aanbeveling} (${b.prioriteit})`).join('\n') || '- Geen kritieke punten gevonden'}

Bevindingen die in orde zijn:
${bevOk.map((b: { beschrijving: string }) => `- ${b.beschrijving}`).join('\n') || '- Nog niet beoordeeld'}

Geadviseerd materiaal:
${(materialen || []).map((m: { naam: string; hoeveelheid: number }) => `- ${m.naam} (${m.hoeveelheid}x)`).join('\n') || '- Nog niet bepaald'}

Schrijf een tekst van 3-4 alinea's die:
1. Uitlegt wat er geconstateerd is (begrijpelijke taal, geen jargon)
2. Beschrijft wat er aangepast/geïnstalleerd wordt en waarom
3. Aangeeft wat dit betekent voor de veiligheid en het gemak van de klant
4. Eindigt met een positieve noot over de voordelen van de laadpaal

Schrijf in jij/u-stijl (aan de klant gericht). Geen technische normnummers noemen.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const tekst = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ tekst })
  } catch (err) {
    console.error('Klanttekst error:', err)
    return NextResponse.json({ error: 'Genereren mislukt: ' + String(err) }, { status: 500 })
  }
}
