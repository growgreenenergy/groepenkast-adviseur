import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ANALYSE_PROMPT = `Je bent een NEN1010-expert die groepenkastfoto's beoordeelt voor GrowGreen Energy installateurs.

Analyseer deze foto van een groepenkast zorgvuldig en geef bevindingen in het volgende JSON-formaat.

Verplichte controles (controleer altijd):
1. Installatievolgorde: Meter → Hoofdschakelaar → RCD → Groepen (NEN 1010 §537.1.2)
2. PV/EV aansluitingen: nooit vóór de hoofdschakelaar (NEN 1010 §712, §722)
3. Meerdere aftakkingen zonder eigen beveiliging — niet toegestaan
4. Staat bedrading: geordend, gemarkeerd, conform NEN EN IEC 61439-3
5. RCD-type aanwezig en correct (min. Type A; §531)
6. Beschikbare ruimte voor uitbreiding laadpaal
7. Aarding en nulleiding correct aangesloten
8. Overspanningsbeveiliging aanwezig

Geef je bevindingen als JSON-array. Retourneer ALLEEN geldige JSON, geen extra tekst:

{
  "veiligheidsrisicos": ["beschrijf hier directe veiligheidsrisico's indien aanwezig"],
  "bevindingen": [
    {
      "id": "uniek_id",
      "categorie": "installatievolgorde|rcd|aarding|beveiliging|bedrading|ruimte|overspanning|overig",
      "beoordeling": "voldoet|aandacht|niet_voldoet",
      "beschrijving": "Concrete beschrijving van wat je ziet",
      "norm_referentie": "NEN 1010 §... of NEN EN IEC 61439-...",
      "aanbeveling": "Concrete aanbevolen actie",
      "prioriteit": "verplicht|aanbevolen|optioneel",
      "bevinding_tags": ["tag1", "tag2"]
    }
  ],
  "samenvatting": "Korte samenvatting in 2-3 zinnen voor de installateur",
  "geschat_werk": "Schatting van de benodigde werkzaamheden (bijv. '2-4 uur + materialen')",
  "fysieke_inspectie_vereist": true,
  "foto_beperking_waarschuwing": "Let op: deze analyse is gebaseerd op een foto en vervangt geen volledige keuring conform NEN 1010."
}

Gebruik de volgende bevinding_tags zodat producten automatisch gekoppeld kunnen worden:
- rcd, rcd_type_b, rcd_vervanging (voor aardlekschakelaars)
- laadpaal_groep (voor nieuwe laadpaalgroep)  
- laadpaal_nieuw, laadpaal_nieuw_zakelijk (voor laadpaal zelf)
- kast_te_klein, kast_vervangen, kast_uitbreiden (voor groepenkast)
- beveiliging, groep_toevoegen (voor automaten)
- overspanning (voor overspanningsbeveiliging)
- kabel_toevoegen (voor kabel)
- loadbalancing (voor Zaptec Sense P1)

Wees concreet en praktisch. Als iets niet zichtbaar is op de foto, vermeld dit eerlijk.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', installatieType = 'woning' } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Geen afbeelding meegegeven' }, { status: 400 })
    }

    const contextNote = installatieType === 'zakelijk'
      ? ' Dit is een zakelijke installatie — hogere eisen van toepassing (NEN EN IEC 61439-3).'
      : ' Dit is een woninginstallatie.'

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: ANALYSE_PROMPT + contextNote,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon analyse niet parsen' }, { status: 500 })
    }

    const analyse = JSON.parse(jsonMatch[0])
    return NextResponse.json({ analyse })
  } catch (err) {
    console.error('Analyse error:', err)
    return NextResponse.json({ error: 'Analyse mislukt: ' + String(err) }, { status: 500 })
  }
}
