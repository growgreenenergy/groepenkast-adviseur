'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Inspectie = {
  id: string
  klant_naam: string
  klant_adres: string
  type: string
  status: string
  created_at: string
  bevindingen_json: string
}

export default function Dashboard() {
  const [inspecties, setInspecties] = useState<Inspectie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('inspecties')
      .select('id, klant_naam, klant_adres, type, status, created_at, bevindingen_json')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setInspecties(data)
        setLoading(false)
      })
  }, [])

  function getBevindingCount(json: string) {
    try {
      const arr = JSON.parse(json || '[]')
      const kritiek = arr.filter((b: { beoordeling: string }) => b.beoordeling === 'niet_voldoet').length
      const aandacht = arr.filter((b: { beoordeling: string }) => b.beoordeling === 'aandacht').length
      return { kritiek, aandacht, totaal: arr.length }
    } catch { return { kritiek: 0, aandacht: 0, totaal: 0 } }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/inspectie/nieuw" className="btn-primary text-center text-base py-4 rounded-xl block">
        + Nieuwe Inspectie
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-green-700">{inspecties.length}</div>
          <div className="text-xs text-gray-500 mt-1">Inspecties</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-yellow-600">
            {inspecties.filter(i => i.status === 'concept').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Concept</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-green-600">
            {inspecties.filter(i => i.status === 'definitief').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Definitief</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recente inspecties
        </h2>

        {loading ? (
          <div className="card text-center text-gray-400 py-8">Laden...</div>
        ) : inspecties.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🔌</div>
            <p className="text-gray-500 text-sm">Nog geen inspecties. Start met je eerste analyse!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {inspecties.map((i) => {
              const counts = getBevindingCount(i.bevindingen_json)
              return (
                <Link
                  key={i.id}
                  href={`/inspectie/${i.id}`}
                  className="card hover:shadow-md transition-shadow flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 group-hover:text-green-700 truncate">
                      {i.klant_naam || 'Onbekende klant'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {i.type === 'zakelijk' ? 'Zakelijk' : 'Woning'}
                      {i.klant_adres && ' · ' + i.klant_adres}
                    </div>
                    {counts.totaal > 0 && (
                      <div className="flex gap-2 mt-1.5">
                        {counts.kritiek > 0 && (
                          <span className="badge-niet-voldoet">x {counts.kritiek} kritiek</span>
                        )}
                        {counts.aandacht > 0 && (
                          <span className="badge-aandacht">! {counts.aandacht} aandacht</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      i.status === 'definitief' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {i.status === 'definitief' ? 'Definitief' : 'Concept'}
                    </span>
                    <span className="text-gray-300">›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-6">
        <Link href="/batch-import" className="text-sm text-green-700 hover:text-green-900 font-medium">
          📦 Batch import
        </Link>
        <Link href="/producten" className="text-sm text-green-700 hover:text-green-900 font-medium">
          Productcatalogus beheren
        </Link>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
