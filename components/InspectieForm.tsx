'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { DEFAULT_PRODUCTS, type Product } from '@/lib/products'

// ─── Types ─────────────────────────────────────────────────────────────────
type Beoordeling = 'voldoet' | 'aandacht' | 'niet_voldoet'
type Prioriteit = 'verplicht' | 'aanbevolen' | 'optioneel'
type FeedbackStatus = 'positief' | 'negatief' | null

type Bevinding = {
  id: string
  categorie: string
  beoordeling: Beoordeling
  beschrijving: string
  norm_referentie: string
  aanbeveling: string
  prioriteit: Prioriteit
  bevinding_tags: string[]
  handmatig?: boolean
}

type MateriaalItem = {
  product_id: string
  naam: string
  merk: string
  artikelnummer: string
  hoeveelheid: number
  prijs?: number
}

type FormData = {
  klant_naam: string
  klant_adres: string
  type: 'woning' | 'zakelijk'
  hoofdzekering: string
  aantal_groepen: string
  vrije_groepen: string
  vrije_ruimte: string
  rcd_type: string
  installatie_leeftijd: string
  opmerkingen: string
  status: 'concept' | 'definitief'
}

const EMPTY_FORM: FormData = {
  klant_naam: '', klant_adres: '', type: 'woning',
  hoofdzekering: '', aantal_groepen: '', vrije_groepen: '',
  vrije_ruimte: '', rcd_type: '', installatie_leeftijd: '',
  opmerkingen: '', status: 'concept',
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function InspectieForm({ inspectieId }: { inspectieId?: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [fotos, setFotos] = useState<string[]>([])
  const [bevindingen, setBevindingen] = useState<Bevinding[]>([])
  const [materialen, setMaterialen] = useState<MateriaalItem[]>([])
  const [klantTekst, setKlantTekst] = useState('')
  const [analyse, setAnalyse] = useState<{ samenvatting?: string; veiligheidsrisicos?: string[]; geschat_werk?: string; foto_beperking_waarschuwing?: string } | null>(null)
  const [producten, setProducten] = useState<Product[]>([])
  const [analysing, setAnalysing] = useState(false)
  const [analyseError, setAnalyseError] = useState('')
  const [generatingTekst, setGeneratingTekst] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Feedback per bevinding: { [bevinding_id]: { status, opmerking, verzonden } }
  const [feedback, setFeedback] = useState<Record<string, { status: FeedbackStatus; opmerking: string; verzonden: boolean }>>({})

  const steps = ['Situatie', 'Foto analyse', 'Bevindingen', 'Materiaal', 'Advies']

  // ── Load existing ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Load product catalog from Supabase (fallback to defaults)
    supabase.from('producten').select('*').eq('actief', true).then(({ data }) => {
      setProducten(data?.length ? (data as Product[]) : DEFAULT_PRODUCTS.map((p, i) => ({ ...p, id: String(i) })))
    })

    if (inspectieId) {
      supabase.from('inspecties').select('*').eq('id', inspectieId).single().then(({ data }) => {
        if (!data) return
        setForm({
          klant_naam: data.klant_naam || '', klant_adres: data.klant_adres || '',
          type: data.type || 'woning', hoofdzekering: data.hoofdzekering || '',
          aantal_groepen: String(data.aantal_groepen || ''), vrije_groepen: String(data.vrije_groepen || ''),
          vrije_ruimte: data.vrije_ruimte || '', rcd_type: data.rcd_type || '',
          installatie_leeftijd: data.installatie_leeftijd || '', opmerkingen: data.opmerkingen || '',
          status: data.status || 'concept',
        })
        try { setFotos(JSON.parse(data.fotos_json || '[]')) } catch {}
        try { setBevindingen(JSON.parse(data.bevindingen_json || '[]')) } catch {}
        try { setMaterialen(JSON.parse(data.materiaal_json || '[]')) } catch {}
        try { setAnalyse(JSON.parse(data.analyse_json || '{}')) } catch {}
        setKlantTekst(data.klant_tekst || '')
      })
    }
  }, [inspectieId])

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveInspectie = useCallback(async (status?: 'concept' | 'definitief') => {
    setSaving(true)
    const payload = {
      ...form,
      status: status || form.status,
      aantal_groepen: form.aantal_groepen ? parseInt(form.aantal_groepen) : null,
      vrije_groepen: form.vrije_groepen ? parseInt(form.vrije_groepen) : null,
      fotos_json: JSON.stringify(fotos),
      bevindingen_json: JSON.stringify(bevindingen),
      materiaal_json: JSON.stringify(materialen),
      analyse_json: JSON.stringify(analyse || {}),
      klant_tekst: klantTekst,
      updated_at: new Date().toISOString(),
    }

    let error
    if (inspectieId) {
      ;({ error } = await supabase.from('inspecties').update(payload).eq('id', inspectieId))
    } else {
      const { data: inserted, error: err } = await supabase.from('inspecties').insert(payload).select('id').single()
      error = err
      if (inserted) router.replace(`/inspectie/${inserted.id}`)
    }

    setSaving(false)
    if (!error) { setSaved(true); setSaveError(false); setTimeout(() => setSaved(false), 2000) }
    else { setSaveError(true); console.error(error) }
  }, [form, fotos, bevindingen, materialen, analyse, klantTekst, inspectieId, router])

  function triggerAutoSave() {
    clearTimeout(autoSaveTimeout.current)
    autoSaveTimeout.current = setTimeout(() => saveInspectie('concept'), 3000)
  }

  function setField(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    triggerAutoSave()
  }

  function goToStep(i: number) {
    if (i !== step) { clearTimeout(autoSaveTimeout.current); saveInspectie('concept') }
    setStep(i)
  }

  // ── Foto compressie ───────────────────────────────────────────────────────
  function compressImage(file: File, maxPx = 1400): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          const base64 = dataUrl.split(',')[1]
          resolve({ base64, dataUrl, mimeType: 'image/jpeg' })
        }
        img.src = ev.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const results = await Promise.all(files.map(f => compressImage(f)))
    setFotos(prev => {
      const next = [...prev, ...results.map(r => r.dataUrl)]
      triggerAutoSave()
      return next
    })
    e.target.value = ''
    return results
  }

  // ── AI Analyse ────────────────────────────────────────────────────────────
  async function analyseerFotos() {
    if (!fotos.length) { setAnalyseError('Upload eerst minimaal één foto.'); return }
    setAnalysing(true)
    setAnalyseError('')

    try {
      // Analyse eerste foto (meest informatief)
      const base64 = fotos[0].split(',')[1]
      const resp = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', installatieType: form.type }),
      })
      const data = await resp.json()
      if (!resp.ok || data.error) throw new Error(data.error || 'Analyse mislukt')

      const a = data.analyse
      setAnalyse(a)

      // Zet bevindingen
      if (a.bevindingen?.length) {
        setBevindingen(a.bevindingen)
        // Auto-match materialen
        matchMateriaal(a.bevindingen)
      }

      triggerAutoSave()
      setStep(3) // ga naar bevindingen
    } catch (err) {
      setAnalyseError('Analyse mislukt: ' + String(err))
    } finally {
      setAnalysing(false)
    }
  }

  // ── Materiaal matchen ─────────────────────────────────────────────────────
  function matchMateriaal(bevs: Bevinding[]) {
    const allTags = new Set(bevs.flatMap(b => b.bevinding_tags || []))
    const matched: MateriaalItem[] = []

    producten.forEach(p => {
      const hits = p.bevinding_tags.filter(t => allTags.has(t))
      if (hits.length > 0) {
        matched.push({
          product_id: p.id,
          naam: p.naam,
          merk: p.merk,
          artikelnummer: p.artikelnummer,
          hoeveelheid: 1,
          prijs: p.prijs,
        })
      }
    })
    setMaterialen(matched)
  }

  function updateBevinding(id: string, updates: Partial<Bevinding>) {
    setBevindingen(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    triggerAutoSave()
  }

  function voegBevindingToe() {
    const nieuw: Bevinding = {
      id: 'hand_' + Date.now(),
      categorie: 'overig',
      beoordeling: 'aandacht',
      beschrijving: '',
      norm_referentie: '',
      aanbeveling: '',
      prioriteit: 'aanbevolen',
      bevinding_tags: [],
      handmatig: true,
    }
    setBevindingen(prev => [...prev, nieuw])
  }

  function verwijderBevinding(id: string) {
    setBevindingen(prev => prev.filter(b => b.id !== id))
    triggerAutoSave()
  }

  function updateMateriaal(idx: number, updates: Partial<MateriaalItem>) {
    setMaterialen(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m))
    triggerAutoSave()
  }

  function verwijderMateriaal(idx: number) {
    setMaterialen(prev => prev.filter((_, i) => i !== idx))
    triggerAutoSave()
  }

  function voegMateriaalToe(product: Product) {
    const exists = materialen.find(m => m.product_id === product.id)
    if (exists) {
      updateMateriaal(materialen.indexOf(exists), { hoeveelheid: exists.hoeveelheid + 1 })
    } else {
      setMaterialen(prev => [...prev, {
        product_id: product.id, naam: product.naam, merk: product.merk,
        artikelnummer: product.artikelnummer, hoeveelheid: 1, prijs: product.prijs,
      }])
    }
    triggerAutoSave()
  }

  // ── Klanttekst genereren ──────────────────────────────────────────────────
  async function genereerKlantTekst() {
    setGeneratingTekst(true)
    try {
      const resp = await fetch('/api/klanttekst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bevindingen, materialen, installatieType: form.type, klantNaam: form.klant_naam }),
      })
      const data = await resp.json()
      if (data.tekst) { setKlantTekst(data.tekst); triggerAutoSave() }
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingTekst(false)
    }
  }

  // ── Bevinding feedback ────────────────────────────────────────────────────
  function setFeedbackStatus(bevId: string, status: FeedbackStatus) {
    setFeedback(prev => ({ ...prev, [bevId]: { ...prev[bevId], status, opmerking: prev[bevId]?.opmerking || '', verzonden: false } }))
  }

  function setFeedbackOpmerking(bevId: string, opmerking: string) {
    setFeedback(prev => ({ ...prev, [bevId]: { ...prev[bevId], opmerking, verzonden: prev[bevId]?.verzonden || false } }))
  }

  async function verstuurFeedback(bevId: string, beschrijving: string) {
    const fb = feedback[bevId]
    if (!fb?.status) return
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectie_id: inspectieId || null,
          bevinding_id: bevId,
          bevinding_beschrijving: beschrijving,
          feedback: fb.status,
          opmerking: fb.opmerking || null,
        }),
      })
      setFeedback(prev => ({ ...prev, [bevId]: { ...prev[bevId], verzonden: true } }))
    } catch (err) {
      console.error('Feedback versturen mislukt:', err)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function beoordelingBadge(b: Beoordeling) {
    if (b === 'voldoet') return <span className="badge-voldoet">✓ Voldoet</span>
    if (b === 'aandacht') return <span className="badge-aandacht">⚠ Aandacht</span>
    return <span className="badge-niet-voldoet">✗ Niet voldoet</span>
  }

  function prioriteitBadge(p: Prioriteit) {
    if (p === 'verplicht') return <span className="badge-verplicht">Verplicht</span>
    if (p === 'aanbevolen') return <span className="badge-aanbevolen">Aanbevolen</span>
    return <span className="badge-optioneel">Optioneel</span>
  }

  const totalePrijs = materialen.reduce((sum, m) => sum + (m.prijs || 0) * m.hoeveelheid, 0)
  const kritiekCount = bevindingen.filter(b => b.beoordeling === 'niet_voldoet').length
  const aandachtCount = bevindingen.filter(b => b.beoordeling === 'aandacht').length

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Step navigation */}
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <button key={i} onClick={() => goToStep(i + 1)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              step === i + 1 ? 'bg-green-700 text-white'
              : step > i + 1 ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
            }`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Save status */}
      {(saving || saved || saveError) && (
        <div className={`text-xs text-center py-1 rounded-lg ${saveError ? 'bg-red-50 text-red-700' : saved ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
          {saving ? '💾 Opslaan...' : saveError ? '⚠️ Opslaan mislukt — controleer verbinding' : '✓ Opgeslagen'}
        </div>
      )}

      {/* ── STAP 1: Situatie ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card">
          <div className="step-header -mx-6 -mt-6 mb-5 px-6">1. Situatie</div>

          <div className="grid gap-3">
            <div>
              <label className="form-label">Type installatie</label>
              <div className="flex gap-2">
                {(['woning', 'zakelijk'] as const).map(t => (
                  <button key={t} onClick={() => setField('type', t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.type === t ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                    }`}>
                    {t === 'woning' ? '🏠 Woning' : '🏢 Zakelijk'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Klantnaam</label>
              <input className="form-input" value={form.klant_naam} onChange={e => setField('klant_naam', e.target.value)} placeholder="Naam klant of bedrijf" />
            </div>
            <div>
              <label className="form-label">Adres</label>
              <input className="form-input" value={form.klant_adres} onChange={e => setField('klant_adres', e.target.value)} placeholder="Installatieadres" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Hoofdzekering</label>
                <select className="form-input" value={form.hoofdzekering} onChange={e => setField('hoofdzekering', e.target.value)}>
                  <option value="">Selecteer...</option>
                  <option>25A</option><option>35A</option><option>40A</option>
                  <option>50A</option><option>63A</option><option>80A</option>
                </select>
              </div>
              <div>
                <label className="form-label">Leeftijd installatie</label>
                <select className="form-input" value={form.installatie_leeftijd} onChange={e => setField('installatie_leeftijd', e.target.value)}>
                  <option value="">Onbekend</option>
                  <option>Nieuwer dan 10 jaar</option>
                  <option>10-20 jaar</option>
                  <option>20-30 jaar</option>
                  <option>Ouder dan 30 jaar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Aantal groepen</label>
                <input className="form-input" type="number" min="1" max="40" value={form.aantal_groepen} onChange={e => setField('aantal_groepen', e.target.value)} placeholder="bijv. 12" />
              </div>
              <div>
                <label className="form-label">Vrije groepen</label>
                <input className="form-input" type="number" min="0" max="40" value={form.vrije_groepen} onChange={e => setField('vrije_groepen', e.target.value)} placeholder="bijv. 2" />
              </div>
            </div>

            <div>
              <label className="form-label">RCD type aanwezig</label>
              <select className="form-input" value={form.rcd_type} onChange={e => setField('rcd_type', e.target.value)}>
                <option value="">Onbekend / niet gezien</option>
                <option>Type AC (oud)</option>
                <option>Type A</option>
                <option>Type A+</option>
                <option>Type B</option>
                <option>Type F</option>
                <option>Geen RCD</option>
              </select>
            </div>

            <div>
              <label className="form-label">Vrije ruimte in kast</label>
              <select className="form-input" value={form.vrije_ruimte} onChange={e => setField('vrije_ruimte', e.target.value)}>
                <option value="">Onbekend</option>
                <option>Voldoende (2+ modules vrij)</option>
                <option>Beperkt (1 module)</option>
                <option>Geen ruimte</option>
                <option>Nieuwe kast vereist</option>
              </select>
            </div>

            <div>
              <label className="form-label">Opmerkingen</label>
              <textarea className="form-input" rows={3} value={form.opmerkingen} onChange={e => setField('opmerkingen', e.target.value)} placeholder="Bijzonderheden, notities..." />
            </div>
          </div>

          <button onClick={() => goToStep(2)} className="btn-primary w-full mt-5">
            Volgende: Foto uploaden →
          </button>
        </div>
      )}

      {/* ── STAP 2: Foto analyse ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="step-header -mx-6 -mt-6 mb-5 px-6">2. Foto analyse</div>

            {/* Foto upload */}
            <div className="mb-4">
              <label className="form-label">Foto&apos;s groepenkast</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-green-400 transition-colors bg-gray-50">
                <span className="text-3xl mb-2">📷</span>
                <span className="text-sm text-gray-500">Klik om foto&apos;s te uploaden</span>
                <span className="text-xs text-gray-400 mt-1">JPG, PNG — meerdere foto&apos;s mogelijk</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
              </label>
            </div>

            {/* Foto preview */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {fotos.map((f, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setFotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow">
                      ×
                    </button>
                    {idx === 0 && <span className="absolute bottom-1 left-1 bg-green-700 text-white text-xs px-1.5 py-0.5 rounded">Analyse</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Analyse knop */}
            {fotos.length > 0 && (
              <button onClick={analyseerFotos} disabled={analysing}
                className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
                  analysing ? 'bg-blue-100 text-blue-600 cursor-wait' : 'bg-green-700 hover:bg-green-800 text-white'
                }`}>
                {analysing ? '🔍 Analyseren met AI...' : '🤖 Analyseer groepenkast met AI'}
              </button>
            )}

            {analyseError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                {analyseError}
              </div>
            )}

            {/* Analyse resultaat preview */}
            {analyse?.samenvatting && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-green-800 mb-1">AI analyse voltooid</div>
                <p className="text-sm text-green-900">{analyse.samenvatting}</p>
                {analyse.geschat_werk && (
                  <p className="text-xs text-green-700 mt-2">⏱ {analyse.geschat_werk}</p>
                )}
                {analyse.veiligheidsrisicos && analyse.veiligheidsrisicos.length > 0 && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs font-bold text-red-800 mb-1">⚠️ Veiligheidsrisico&apos;s</div>
                    {analyse.veiligheidsrisicos.map((r, i) => (
                      <div key={i} className="text-xs text-red-700">• {r}</div>
                    ))}
                  </div>
                )}
                <button onClick={() => setStep(3)} className="mt-3 text-sm text-green-700 font-semibold underline">
                  Bekijk {bevindingen.length} bevindingen →
                </button>
              </div>
            )}

            {!analyse?.samenvatting && fotos.length === 0 && (
              <div className="mt-3 text-center text-sm text-gray-400 py-4">
                Upload een foto om de AI-analyse te starten
              </div>
            )}
          </div>

          {/* Handmatig doorgaan */}
          <button onClick={() => setStep(3)} className="btn-secondary w-full text-sm">
            Handmatig bevindingen invoeren →
          </button>
        </div>
      )}

      {/* ── STAP 3: Bevindingen ──────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-3">
          {/* Samenvatting */}
          {(kritiekCount > 0 || aandachtCount > 0) && (
            <div className="card py-4">
              <div className="flex gap-4 justify-center">
                {kritiekCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{kritiekCount}</div>
                    <div className="text-xs text-gray-500">Kritiek</div>
                  </div>
                )}
                {aandachtCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{aandachtCount}</div>
                    <div className="text-xs text-gray-500">Aandacht</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{bevindingen.filter(b => b.beoordeling === 'voldoet').length}</div>
                  <div className="text-xs text-gray-500">OK</div>
                </div>
              </div>
              {analyse?.foto_beperking_waarschuwing && (
                <p className="text-xs text-gray-400 text-center mt-3 italic">{analyse.foto_beperking_waarschuwing}</p>
              )}
            </div>
          )}

          {bevindingen.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">Nog geen bevindingen. Analyseer een foto of voeg handmatig toe.</p>
            </div>
          ) : (
            bevindingen.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {beoordelingBadge(b.beoordeling)}
                    {prioriteitBadge(b.prioriteit)}
                  </div>
                  <button onClick={() => verwijderBevinding(b.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>

                <div className="text-sm font-medium text-gray-800 mb-1">{b.beschrijving || <span className="text-gray-400 italic">Geen omschrijving</span>}</div>
                {b.norm_referentie && <div className="text-xs text-blue-600 mb-2">{b.norm_referentie}</div>}
                {b.aanbeveling && <div className="text-xs text-gray-500 mb-3">→ {b.aanbeveling}</div>}

                {/* Edit controls */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                  <div>
                    <label className="form-label">Beoordeling</label>
                    <select className="form-input text-xs py-1.5" value={b.beoordeling}
                      onChange={e => updateBevinding(b.id, { beoordeling: e.target.value as Beoordeling })}>
                      <option value="voldoet">Voldoet</option>
                      <option value="aandacht">Aandacht</option>
                      <option value="niet_voldoet">Niet voldoet</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Prioriteit</label>
                    <select className="form-input text-xs py-1.5" value={b.prioriteit}
                      onChange={e => updateBevinding(b.id, { prioriteit: e.target.value as Prioriteit })}>
                      <option value="verplicht">Verplicht</option>
                      <option value="aanbevolen">Aanbevolen</option>
                      <option value="optioneel">Optioneel</option>
                    </select>
                  </div>
                </div>

                {b.handmatig && (
                  <div className="mt-2 grid gap-2">
                    <input className="form-input text-xs" placeholder="Beschrijving..."
                      value={b.beschrijving} onChange={e => updateBevinding(b.id, { beschrijving: e.target.value })} />
                    <input className="form-input text-xs" placeholder="Aanbeveling..."
                      value={b.aanbeveling} onChange={e => updateBevinding(b.id, { aanbeveling: e.target.value })} />
                    <input className="form-input text-xs" placeholder="Norm referentie (bijv. NEN 1010 §531)..."
                      value={b.norm_referentie} onChange={e => updateBevinding(b.id, { norm_referentie: e.target.value })} />
                  </div>
                )}

                {/* ── Feedback ─────────────────────────────────────── */}
                {!b.handmatig && (() => {
                  const fb = feedback[b.id]
                  if (fb?.verzonden) return (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                      ✓ Feedback ontvangen — bedankt!
                    </div>
                  )
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex-1">Klopt deze bevinding?</span>
                        <button
                          onClick={() => setFeedbackStatus(b.id, fb?.status === 'positief' ? null : 'positief')}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${fb?.status === 'positief' ? 'bg-green-100 text-green-700 font-semibold' : 'bg-gray-100 text-gray-500 hover:bg-green-50'}`}>
                          👍
                        </button>
                        <button
                          onClick={() => setFeedbackStatus(b.id, fb?.status === 'negatief' ? null : 'negatief')}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${fb?.status === 'negatief' ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`}>
                          👎
                        </button>
                        {fb?.status && (
                          <button
                            onClick={() => verstuurFeedback(b.id, b.beschrijving)}
                            className="px-3 py-1 rounded-lg text-xs bg-green-700 text-white hover:bg-green-800 transition-colors">
                            Stuur
                          </button>
                        )}
                      </div>
                      {fb?.status === 'negatief' && (
                        <input
                          className="form-input text-xs mt-2"
                          placeholder="Wat klopt er niet? (optioneel)"
                          value={fb.opmerking}
                          onChange={e => setFeedbackOpmerking(b.id, e.target.value)}
                        />
                      )}
                    </div>
                  )
                })()}
              </div>
            ))
          )}

          <button onClick={voegBevindingToe} className="btn-secondary w-full text-sm">
            + Bevinding handmatig toevoegen
          </button>

          <button onClick={() => { matchMateriaal(bevindingen); goToStep(4) }} className="btn-primary w-full">
            Volgende: Materiaallijst →
          </button>
        </div>
      )}

      {/* ── STAP 4: Materiaal ────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="step-header -mx-6 -mt-6 mb-5 px-6">4. Materiaallijst</div>

            {materialen.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">Geen materialen automatisch gekoppeld.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {materialen.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{m.naam}</div>
                      <div className="text-xs text-gray-400">{m.merk} · {m.artikelnummer}</div>
                      {m.prijs && <div className="text-xs text-green-700 font-medium">€ {(m.prijs * m.hoeveelheid).toFixed(2)}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateMateriaal(idx, { hoeveelheid: Math.max(1, m.hoeveelheid - 1) })}
                        className="w-7 h-7 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm">−</button>
                      <span className="w-6 text-center text-sm font-medium">{m.hoeveelheid}</span>
                      <button onClick={() => updateMateriaal(idx, { hoeveelheid: m.hoeveelheid + 1 })}
                        className="w-7 h-7 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm">+</button>
                    </div>
                    <button onClick={() => verwijderMateriaal(idx)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </div>
                ))}
              </div>
            )}

            {totalePrijs > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Totaal materiaal</span>
                <span className="text-base font-bold text-green-700">€ {totalePrijs.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Product toevoegen uit catalogus */}
          <div className="card">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Toevoegen uit catalogus</div>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {producten.filter(p => p.actief).map(p => (
                <button key={p.id} onClick={() => voegMateriaalToe(p)}
                  className="flex items-center justify-between text-left px-3 py-2 rounded-xl hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{p.naam}</div>
                    <div className="text-xs text-gray-400">{p.merk} · {p.artikelnummer}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.prijs && <span className="text-xs text-green-700">€{p.prijs}</span>}
                    <span className="text-green-600 text-lg">+</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => goToStep(5)} className="btn-primary w-full">
            Volgende: Advies tekst →
          </button>
        </div>
      )}

      {/* ── STAP 5: Advies ───────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="flex flex-col gap-4">
          {/* Samenvatting kaartje */}
          <div className="card bg-green-50 border-green-200">
            <div className="text-sm font-bold text-green-800 mb-3">Inspectie samenvatting</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Klant:</span> <span className="font-medium">{form.klant_naam || '—'}</span></div>
              <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{form.type}</span></div>
              <div><span className="text-gray-500">Bevindingen:</span> <span className="font-medium">{bevindingen.length}</span></div>
              <div><span className="text-gray-500">Materialen:</span> <span className="font-medium">{materialen.length} items</span></div>
              {totalePrijs > 0 && <div className="col-span-2"><span className="text-gray-500">Materiaalwaarde:</span> <span className="font-bold text-green-700"> € {totalePrijs.toFixed(2)}</span></div>}
            </div>
          </div>

          {/* Klanttekst */}
          <div className="card">
            <div className="step-header -mx-6 -mt-6 mb-5 px-6">5. Klanttekst</div>

            <button onClick={genereerKlantTekst} disabled={generatingTekst}
              className={`w-full py-3 rounded-xl font-semibold text-sm mb-4 transition-colors ${
                generatingTekst ? 'bg-blue-100 text-blue-600 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}>
              {generatingTekst ? '✍️ Genereren...' : '✨ Genereer klanttekst met AI'}
            </button>

            <div>
              <label className="form-label">Tekst voor klant</label>
              <textarea className="form-input" rows={8} value={klantTekst}
                onChange={e => { setKlantTekst(e.target.value); triggerAutoSave() }}
                placeholder="Klik op 'Genereer klanttekst' of schrijf zelf een toelichting..." />
            </div>
          </div>

          {/* Actieknoppen */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => saveInspectie('concept')} className="btn-secondary">
              Opslaan als concept
            </button>
            <button onClick={() => saveInspectie('definitief')} className="btn-primary">
              Definitief opslaan ✓
            </button>
          </div>

          <a href="/" className="text-center text-sm text-gray-400 hover:text-gray-600">
            ← Terug naar overzicht
          </a>
        </div>
      )}
    </div>
  )
}
