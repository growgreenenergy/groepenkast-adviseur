'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_PRODUCTS, type Product } from '@/lib/products'
import Link from 'next/link'

export default function ProductenBeheer() {
  const [producten, setProducten] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    loadProducten()
  }, [])

  async function loadProducten() {
    const { data } = await supabase.from('producten').select('*').order('merk').order('naam')
    if (data && data.length > 0) {
      setProducten(data as Product[])
    } else {
      // Seed default products
      await seedDefaults()
    }
    setLoading(false)
  }

  async function seedDefaults() {
    const { data } = await supabase.from('producten').insert(DEFAULT_PRODUCTS).select()
    if (data) { setProducten(data as Product[]); setSeeded(true) }
  }

  async function toggleActief(id: string, actief: boolean) {
    await supabase.from('producten').update({ actief: !actief }).eq('id', id)
    setProducten(prev => prev.map(p => p.id === id ? { ...p, actief: !actief } : p))
  }

  async function updatePrijs(id: string, prijs: number) {
    await supabase.from('producten').update({ prijs }).eq('id', id)
    setProducten(prev => prev.map(p => p.id === id ? { ...p, prijs } : p))
  }

  const merken = [...new Set(producten.map(p => p.merk))]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">Productcatalogus</h1>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Terug</Link>
      </div>

      {seeded && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl p-3">
          ✓ Standaard producten geladen. Pas prijzen aan naar eigen inkoopprijzen.
        </div>
      )}

      {loading ? (
        <div className="card text-center text-gray-400 py-8">Laden...</div>
      ) : (
        merken.map(merk => (
          <div key={merk} className="card">
            <div className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">{merk}</div>
            <div className="flex flex-col gap-2">
              {producten.filter(p => p.merk === merk).map(p => (
                <div key={p.id} className={`flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 ${!p.actief ? 'opacity-40' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.naam}</div>
                    <div className="text-xs text-gray-400">{p.artikelnummer} · {p.categorie}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 mr-1">€</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right"
                        value={p.prijs || ''}
                        onChange={e => updatePrijs(p.id, parseFloat(e.target.value))}
                      />
                    </div>
                    <button
                      onClick={() => toggleActief(p.id, p.actief)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                        p.actief ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'
                      }`}>
                      {p.actief ? 'Actief' : 'Inactief'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
