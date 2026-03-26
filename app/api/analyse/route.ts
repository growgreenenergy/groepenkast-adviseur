import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ANALYSE_PROMPT = `Je bent een gecertificeerd NEN 1010-expert die groepenkastfoto's beoordeelt voor GrowGreen Energy installateurs. Je analyseert conform NEN 1010:2020+C1:2024 en NEN-EN-IEC 61439-1:2021.

Analyseer de foto zorgvuldig op basis van onderstaande NEN-normen en geef bevindingen in het opgegeven JSON-formaat.

═══════════════════════════════════════════════════
INSPECTIECRITERIA PER NORM (NEN 1010:2020+C1:2024)
═══════════════════════════════════════════════════

■ §41 – BESCHERMING TEGEN ELEKTRISCHE SCHOK
• TT-stelsel (meest voorkomend in NL): aardlekschakelaar (RCD) verplicht als foutbescherming (§411.5)
• Aardweerstand TT-stelsel: R_A × I_Δn ≤ 50V, maximaal 166Ω voor 300mA RCD
• RCD 30mA verplicht als aanvullende bescherming in woningen voor alle wandcontactdozengroepen en vaste aansluitingen ≤20A (§415.1)
• Controleer: elke groep heeft passende beveiliging; RCD staat stroomopwaarts van de groepen die het beveiligt

■ §43 – BEVEILIGING TEGEN OVERSTROOM
• Bij elke verlaging van de kabeldiameter MOET een automaat of smeltveiligheid aanwezig zijn (§434.2)
• Maximaal 3 meter onbeveiligde leiding bij doorsnedevermindering (§434.3)
• Nomimale stroom automaat: I_B ≤ I_n ≤ I_Z (ontwerpstroom ≤ automaat ≤ kabeldraagvermogen)
• Automaten: NEN-EN-IEC 60898-1 (woningen) of 60947-2 (industrieel)
• Smeltveiligheden: NEN-HD-IEC 60269-2/3

■ §44 – BEVEILIGING TEGEN OVERSPANNING (SPD)
• SPD (overspanningsafleider) type 2 sterk aanbevolen voor woningen en zakelijke gebouwen (§443)
• SPD moet zo dicht mogelijk bij het voedingspunt worden geïnstalleerd (§534.4.1)
• In de verdeelinrichting moet aanwezigheid van SPD's zichtbaar zijn (label of zichtbaar apparaat)
• SPD type 2 voldoet aan NEN-EN-IEC 61643-11
• Ontbrekende SPD bij woning/kantoor = bevinding categorie 'overspanning'

■ §53 – BEVEILIGINGSTOESTELLEN (KEUZE & INSTALLATIE)
• RCD-typen:
  - Type AC: alleen wisselstroom lekstromen — VEROUDERD, niet meer conform
  - Type A: wisselstroom + gepulseerde gelijkstroomlekstromen — minimum voor woningen
  - Type B: alle lekstroomtypen incl. zuiver DC — VERPLICHT bij frequentieregelaars, EV-laders met gelijkrichter
  - Type F: voor frequentieregelaars (wasmachines, pompen) met type A eigenschappen
• RCD voor brandbeveiliging: aanspreekstroom ≤ 300mA bij het voedingspunt van de beschermde stroomketen (§532.2)
• AFDD (vlamboogdetectietoestel): aanbevolen in verblijfsgebouwen en logiesgebouwen (§532.6), voldoet aan NEN-EN-IEC 62606
• Automaat kortsluitafschakelcapaciteit (I_cn) moet ≥ verwachte kortsluitstroom op die locatie (§533.3.2)

■ §54 – BESCHERMINGSLEIDINGEN (PE/PEN)
• Minimale doorsnede PE-leiding apart van kabel: 2,5mm² Cu beschermd / 4mm² Cu onbeschermd (§543.1.3)
• PEN-leiding (TN-C): minimaal 10mm² Cu of 16mm² Al (§543.4.1)
• PE-leidingen mogen GEEN schakelaars of scheiders bevatten (§543.3.3)
• PE-leidingen moeten ononderbroken zijn; soldeerverbindingen niet toegestaan
• Kleurcodering: PE = geel/groen, N = blauw, L = bruin/zwart/grijs
• Beschermende vereffeningsleidingen naar aarddrail: minimaal 6mm² Cu (§544.1)

■ §6 – INSPECTIE (VISUELE EISEN)
• Visuele inspectie beveiligingstoestellen: controleer instelling automaten (kortdurend & ogenblikkelijk), nominale stroom, type smeltveiligheid (§6.4.3 punt 2)
• RCD's: visuele inspectie + beproeving vereist bij oplevering (testknop functioneel?)
• Periodieke inspectie woning: aanbevolen elke 10 jaar; bij nieuwe bewoner sterk aanbevolen (§6.5.2)
• Rapport moet bevatten: schade, aftakeling, gebreken, afwijkingen van norm (§6.5.3.2)

■ §701 – BADKAMER/DOUCHE (SITUATIONEEL)
• RCD 30mA verplicht voor alle groepen die zone 1 en zone 2 voeden (wandcontactdoos binnen 60cm van bad/douche)
• Alleen van toepassing als de groepenkast groepen bevat die badkamer/douche bedienen

■ §712 – PV-SYSTEMEN (SITUATIONEEL — controleer indien zichtbaar)
• PV-aansluiting moet ALTIJD via eigen groep ACHTER de hoofdschakelaar
• DC-beveiliging aan inverter-zijde vereist; AC-beveiliging in de groepenkast
• Bidirectionele meter of slimme meter vereist bij teruglevering

■ §722 – EV LAADINRICHTINGEN (SITUATIONEEL — controleer indien zichtbaar/gevraagd)
• Verplichte RCD type B (of type A + DC-detectie) voor elke EV-laadgroep (§722.531.3)
• Eigen groep verplicht: 1-fase 16A of 3-fase 16A/32A naargelang de lader
• Hoofdschakelaar moet EV-lading kunnen afschakelen
• Loadbalancing/slimme lading sterk aanbevolen bij beperkte netcapaciteit

═══════════════════════════════════════════════════
KAST ALS PRODUCT (NEN-EN-IEC 61439-1:2021)
═══════════════════════════════════════════════════

■ §6 – NAAMPLAAT
• Groepenkast moet naamplaat bevatten: toegekende spanning (U_n), toegekende stroom (I_nA), IP-code, fabrikant
• Ontbrekende of onleesbare naamplaat = bevinding

■ §8.2 – IP-BESCHERMINGSGRAAD
• Minimaal IP2X: aanraakbeveiliging actieve delen (druk/draadbescherming)
• IP44 of hoger vereist in vochtige ruimten (badkamer, garage, buiten)
• Open of beschadigde kast = directe veiligheidsfout

■ §8.4 – AARDING OMHULSEL
• Metalen omhulsel moet zijn verbonden met de PE-rail
• Alle aanraakbare metalen delen geaard (deurscharnieren, bevestigingsplaten)

■ §8.6 – INWENDIGE BEDRADING
• Kleurcodering geleiders naleven: L=bruin/zwart/grijs, N=blauw, PE=geel/groen
• Bedrading geordend en geborgd (geen losse draden, geen beschadiging isolatie)
• Onbeschermde actieve geleiders niet onnodig dicht bij elkaar (kortsluitrisico)

■ §8.8 – AANSLUITKLEMMEN
• Aansluitklemmen voor inkomende hoofdkabel toegankelijk en correct gedimensioneerd
• Geen verbindingen buiten de klemmen (gesoldeerde of ongeïsoleerde aftakkingen)

═══════════════════════════════════════════════════
BEOORDELINGSSCHEMA
═══════════════════════════════════════════════════

DIRECTE VEILIGHEIDSRISICO'S (altijd melden als veiligheidsrisicos[]):
• Ontbrekende of defecte RCD in TT-stelsel
• Actieve delen toegankelijk (open kast, ontbrekende afdekking)
• PE-leiding onderbroken of ontbrekend
• Automaat overduidelijk onderdimensioneerd voor de kabel
• Brandschade of smeltverschijnselen zichtbaar
• PV/EV-installatie vóór de hoofdschakelaar aangesloten

AANDACHT-PUNTEN (aandacht):
• RCD type AC aanwezig (verouderd, vervangen door type A)
• Ontbrekende SPD-overspanningsbeveiliging
• Rommelige/ongemarkeerde bedrading
• Volle kast zonder uitbreidingsruimte
• Ontbrekende naamplaat of groepslabels

═══════════════════════════════════════════════════
JSON UITVOER — ALLEEN GELDIGE JSON, GEEN EXTRA TEKST
═══════════════════════════════════════════════════

{
  "veiligheidsrisicos": ["beschrijf directe veiligheidsrisico's; lege array [] als geen"],
  "bevindingen": [
    {
      "id": "uniek_id",
      "categorie": "installatievolgorde|rcd|aarding|beveiliging|bedrading|ruimte|overspanning|pv|ev|kast_conditie|overig",
      "beoordeling": "voldoet|aandacht|niet_voldoet",
      "beschrijving": "Concrete beschrijving van wat je op de foto ziet",
      "norm_referentie": "NEN 1010:2020 §... of NEN-EN-IEC 61439-1:2021 §...",
      "aanbeveling": "Concrete aanbevolen actie voor de installateur",
      "prioriteit": "verplicht|aanbevolen|optioneel",
      "bevinding_tags": ["tag1", "tag2"]
    }
  ],
  "samenvatting": "Korte samenvatting in 2-3 zinnen gericht op de installateur",
  "geschat_werk": "Schatting van benodigde werkzaamheden (bijv. '2-4 uur + materialen')",
  "fysieke_inspectie_vereist": true,
  "foto_beperking_waarschuwing": "Let op: deze analyse is gebaseerd op een foto en vervangt geen volledige keuring conform NEN 1010:2020+C1:2024."
}

Bevinding_tags voor productkoppeling:
- rcd, rcd_type_b, rcd_vervanging (aardlekschakelaars)
- laadpaal_groep (nieuwe laadpaalgroep)
- laadpaal_nieuw, laadpaal_nieuw_zakelijk (laadpaal zelf)
- kast_te_klein, kast_vervangen, kast_uitbreiden (groepenkast)
- beveiliging, groep_toevoegen (automaten)
- overspanning (overspanningsbeveiliging/SPD)
- kabel_toevoegen (kabel)
- loadbalancing (Zaptec Sense P1)
- afdd (vlamboogdetectie)
- pe_leiding (aardingsprobleem)

Wees concreet en praktisch. Als iets niet zichtbaar is op de foto, vermeld dit eerlijk en geef aan wat bij fysieke inspectie gecontroleerd moet worden.`

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
      max_tokens: 4000,
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
