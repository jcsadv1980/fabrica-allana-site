'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Venda } from '@/lib/types'

const AnalyticsWorkbench = dynamic(() => import('./analytics-workbench').then(module => module.AnalyticsWorkbench), { loading: () => <div role="status" aria-label="Carregando análises"><Skeleton className="h-[640px] w-full rounded-2xl" /></div> })

export function AnalyticsSection({ vendas, custos }: { vendas: Venda[]; custos: Record<string, number> }) {
  const [open, setOpen] = useState(false)
  return <section className="flex flex-col gap-4"><Button variant="outline" aria-expanded={open} aria-controls="dashboard-analytics" onClick={() => setOpen(value => !value)}>{open ? 'Fechar análises detalhadas' : 'Abrir análises detalhadas'}</Button><div id="dashboard-analytics">{open && <AnalyticsWorkbench vendas={vendas} custos={custos} />}</div></section>
}
