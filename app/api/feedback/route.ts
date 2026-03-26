import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { inspectie_id, bevinding_id, bevinding_beschrijving, feedback, opmerking } = await req.json()

    if (!bevinding_id || !feedback) {
      return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
    }

    const { error } = await supabase.from('bevinding_feedback').insert({
      inspectie_id: inspectie_id || null,
      bevinding_id,
      bevinding_beschrijving,
      feedback,
      opmerking: opmerking || null,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Feedback error:', err)
    return NextResponse.json({ error: 'Opslaan mislukt: ' + String(err) }, { status: 500 })
  }
}
