import InspectieForm from '@/components/InspectieForm'

export default async function InspectiePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InspectieForm inspectieId={id} />
}

export const dynamic = 'force-dynamic'
