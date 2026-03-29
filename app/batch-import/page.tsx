'use client'
import { useState, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/app/supabase-browser'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type BatchStatus = 'wachten' | 'analyseren' | 'opslaan' | 'klaar' | 'fout'

type BatchItem = {
  id: string
  bestandsnaam: string
  previewUrl: string
  base64: string
  mimeType: string
  status: BatchStatus
  foutmelding?: string
  inspectieId?: string
  bevindingen_kritiek?: number
  bevindingen_aandacht?: number
  samenvatting?: string
}

type InstallatieType = 'woning' | 'zakelijk'

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function compressImage(file: File, maxPx = 1280, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx }
        else { width = Math.round((width * maxPx) / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Hoofd component ───────────────────────────────────────────────────────────

export default function BatchImportPage() {
  const supabase = createSupabaseBrowserClient()
  const [items, setItems] = useState<BatchItem[]>([])
  const [installatieType, setInstallatieType] = useState<InstallatieType>('woning')
  const [running, setRunning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [klaarCount, setKlaarCount] = useState(0)
  const [foutCount, setFoutCount] = useState(0)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const abortRef = useRef(false)
  const startTimeRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  function updateItem(id: string, updates: Partial<BatchItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  // ── Bestanden verwerken ───────────────────────────────────────────────────

  async function verwerkBestanden(files: FileList | File[]) {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imgFiles.length) return

    const nieuweItems: BatchItem[] = await Promise.all(imgFiles.map(async (file) => {
      const preview = URL.createObjectURL(file)
      // Compress alvast voor de preview
      const { base64, mimeType } = await compressImage(file)
      return {
        id: crypto.randomUUID(),
        bestandsnaam: file.name,
        previewUrl: preview,
        base64,
        mimeType,
        status: 'wachten' as BatchStatus,
      }
    }))

    setItems(prev => [...prev, ...nieuweItems])
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) verwerkBestanden(e.dataTransfer.files)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  // ── Verwijder item ────────────────────────────────────────────────────────

  function verwijderItem(id: string) {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  // ── Start batch analyse ───────────────────────────────────────────────────

  async function startBatch() {
    const teVerwerken = items.filter(i => i.status === 'wachten' || i.status === 'fout')
    if (!teVerwerken.length) return

    setRunning(true)
    abortRef.current = false
    startTimeRef.current = Date.now()
    let klaar = klaarCount
    let fout = foutCount

    for (let i = 0; i < teVerwerken.length; i++) {
      if (abortRef.current) break
      const item = teVerwerken[i]
      setCurrentIndex(i + 1)

      // ETA berekenen op basis van gemiddelde tijd per foto
      if (i > 0) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const avgPerItem = elapsed / i
        const remaining = (teVerwerken.length - i) * avgPerItem
        setEtaSeconds(Math.round(remaining))
      }

      // Stap 1: analyseren
      updateItem(item.id, { status: 'analyseren' })
      let analyse: Record<string, unknown>
      try {
        const resp = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: item.base64,
            mimeType: item.mimeType,
            installatieType,
          }),
        })
        const json = await resp.json()
        if (!resp.ok || !json.analyse) throw new Error(json.error || 'Analyse mislukt')
        analyse = json.analyse
      } catch (err) {
        updateItem(item.id, { status: 'fout', foutmelding: String(err) })
        fout++; setFoutCount(fout)
        continue
      }

      // Stap 2: opslaan in Supabase
      updateItem(item.id, { status: 'opslaan' })
      try {
        const bevindingen = (analyse.bevindingen as { beoordeling: string }[]) || []
        const kritiek = bevindingen.filter(b => b.beoordeling === 'niet_voldoet').length
        const aandacht = bevindingen.filter(b => b.beoordeling === 'aandacht').length

        const payload = {
          klant_naam: '',
          klant_adres: '',
          type: installatieType,
          status: 'concept' as const,
          hoofdzekering: '',
          aantal_groepen: null,
          vrije_groepen: null,
          vrije_ruimte: '',
          rcd_type: '',
          installatie_leeftijd: '',
          opmerkingen: `Batch import — ${item.bestandsnaam}`,
          fotos_json: JSON.stringify([item.base64]),
          bevindingen_json: JSON.stringify(bevindingen),
          materiaal_json: JSON.stringify([]),
          analyse_json: JSON.stringify(analyse),
          klant_tekst: '',
          updated_at: new Date().toISOString(),
        }

        const { data: inserted, error } = await supabase
          .from('inspecties')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error

        updateItem(item.id, {
          status: 'klaar',
          inspectieId: inserted.id,
          bevindingen_kritiek: kritiek,
          bevindingen_aandacht: aandacht,
          samenvatting: (analyse.samenvatting as string) || '',
        })
        klaar++; setKlaarCount(klaar)
      } catch (err) {
        updateItem(item.id, { status: 'fout', foutmelding: 'Opslaan mislukt: ' + String(err) })
        fout++; setFoutCount(fout)
      }

      // Kleine pauze tussen requests (beschermt tegen API rate limits bij grote batches)
      if (i < teVerwerken.length - 1 && !abortRef.current) {
        await new Promise(res => setTimeout(res, 400))
      }
    }

    setEtaSeconds(null)
    setRunning(false)
  }

  function stopBatch() {
    abortRef.current = true
  }

  function resetAlles() {
    items.forEach(i => URL.revokeObjectURL(i.previewUrl))
    setItems([])
    setKlaarCount(0)
    setFoutCount(0)
    setCurrentIndex(0)
  }

  // ── Statistieken ──────────────────────────────────────────────────────────

  const totaal = items.length
  const wachtend = items.filter(i => i.status === 'wachten').length
  const klaar = items.filter(i => i.status === 'klaar').length
  const fout = items.filter(i => i.status === 'fout').length
  const bezig = items.filter(i => i.status === 'analyseren' || i.status === 'opslaan').length
  const progress = totaal > 0 ? Math.round((klaar / totaal) * 100) : 0

  // ── Status badge ──────────────────────────────────────────────────────────

  function StatusBadge({ status, foutmelding }: { status: BatchStatus; foutmelding?: string }) {
    const map: Record<BatchStatus, { label: string; cls: string; icon: string }> = {
      wachten:    { label: 'Wacht',       cls: 'bg-gray-100 text-gray-500',    icon: '⏳' },
      analyseren: { label: 'Analyseren…', cls: 'bg-blue-100 text-blue-700',    icon: '🔍' },
      opslaan:    { label: 'Opslaan…',    cls: 'bg-yellow-100 text-yellow-700',icon: '💾' },
      klaar:      { label: 'Klaar',       cls: 'bg-green-100 text-green-700',  icon: '✅' },
      fout:       { label: 'Fout',        cls: 'bg-red-100 text-red-700',      icon: '❌' },
    }
    const { label, cls, icon } = map[status]
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}
            title={foutmelding}>
        {icon} {label}
      </span>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">📦 Batch Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload meerdere groepenkastfoto's tegelijk. De AI analyseert ze automatisch en slaat ze op als concept-inspecties.
        </p>
      </div>

      {/* Instellingen */}
      <div className="card flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600 shrink-0">Installatie type:</span>
        <div className="flex gap-2">
          {(['woning', 'zakelijk'] as InstallatieType[]).map(t => (
            <button
              key={t}
              onClick={() => !running && setInstallatieType(t)}
              disabled={running}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                installatieType === t
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'woning' ? '🏠 Woning' : '🏢 Zakelijk'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">
          Geldt voor alle foto's in deze batch
        </span>
      </div>

      {/* Drop zone */}
      {!running && (
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-4xl mb-2">📸</div>
          <p className="font-medium text-gray-700">Sleep foto's hierheen of klik om te selecteren</p>
          <p className="text-sm text-gray-400 mt-1">Meerdere bestanden tegelijk mogelijk (JPG, PNG, HEIC)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && verwerkBestanden(e.target.files)}
          />
        </div>
      )}

      {/* Voortgang stats */}
      {totaal > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700">
              {running
                ? `Bezig met foto ${currentIndex} van ${items.filter(i => i.status !== 'klaar').length + klaar}…`
                : klaar === totaal && totaal > 0
                  ? `✅ Alle ${totaal} foto's verwerkt!`
                  : `${totaal} foto's geladen`}
              {running && etaSeconds !== null && (
                <span className="text-gray-400 font-normal ml-2 text-xs">
                  {'(nog ~'}{etaSeconds >= 60
                    ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`
                    : `${etaSeconds}s`}{')'}
                </span>
              )}
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              {wachtend > 0 && <span>⏳ {wachtend} wachtend</span>}
              {bezig > 0   && <span className="text-blue-600">🔍 {bezig} bezig</span>}
              {klaar > 0   && <span className="text-green-600">✅ {klaar} klaar</span>}
              {fout > 0    && <span className="text-red-600">❌ {fout} fout</span>}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">{progress}% voltooid</div>
        </div>
      )}

      {/* Actieknoppen */}
      {totaal > 0 && (
        <div className="flex gap-3">
          {!running ? (
            <>
              <button
                onClick={startBatch}
                disabled={wachtend === 0 && fout === 0}
                className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {klaar > 0 && wachtend > 0
                  ? `▶ Doorgaan (${wachtend} resterend)`
                  : fout > 0 && wachtend === 0
                    ? `↺ Fouten opnieuw proberen (${fout})`
                    : `▶ Start analyse (${wachtend} foto's)`}
              </button>
              <button
                onClick={resetAlles}
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                ✕ Alles wissen
              </button>
            </>
          ) : (
            <button
              onClick={stopBatch}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-base transition-colors"
            >
              ⏹ Stop na huidige foto
            </button>
          )}
        </div>
      )}

      {/* Foto grid */}
      {items.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Foto's ({items.length})
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`card flex items-center gap-3 py-2.5 transition-colors ${
                  item.status === 'analyseren' || item.status === 'opslaan'
                    ? 'border-blue-200 bg-blue-50'
                    : item.status === 'klaar'
                      ? 'border-green-200'
                      : item.status === 'fout'
                        ? 'border-red-200 bg-red-50'
                        : ''
                }`}
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.bestandsnaam}
                  className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.bestandsnaam}</div>
                  {item.status === 'klaar' && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {(item.bevindingen_kritiek ?? 0) > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          ✕ {item.bevindingen_kritiek} kritiek
                        </span>
                      )}
                      {(item.bevindingen_aandacht ?? 0) > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          ! {item.bevindingen_aandacht} aandacht
                        </span>
                      )}
                      {item.bevindingen_kritiek === 0 && item.bevindingen_aandacht === 0 && (
                        <span className="text-xs text-green-600">Alles in orde</span>
                      )}
                    </div>
                  )}
                  {item.samenvatting && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.samenvatting}</div>
                  )}
                  {item.foutmelding && (
                    <div className="text-xs text-red-600 mt-1">{item.foutmelding}</div>
                  )}
                </div>

                {/* Rechts: status + acties */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={item.status} foutmelding={item.foutmelding} />
                  {item.status === 'klaar' && item.inspectieId && (
                    <Link
                      href={`/inspectie/${item.inspectieId}`}
                      className="text-xs text-green-700 hover:text-green-900 font-medium"
                    >
                      Bekijk →
                    </Link>
                  )}
                  {item.status === 'wachten' && !running && (
                    <button
                      onClick={() => verwijderItem(item.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Verwijder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lege staat */}
      {totaal === 0 && (
        <div className="card text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm">Nog geen foto's geselecteerd.<br />Sleep ze hierboven of klik op het upload-vlak.</p>
        </div>
      )}

      {/* Link terug */}
      <div className="text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Terug naar overzicht
        </Link>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
