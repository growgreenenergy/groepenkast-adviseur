'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()

  async function uitloggen() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={uitloggen}
      className="text-green-200 hover:text-white text-sm transition-colors"
    >
      Uitloggen
    </button>
  )
}
