'use client'

import { useMemo, useState } from 'react'
import { BarChart3, CalendarRange, ChevronRight, Filter, Flag, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Venda } from '@/lib/types'

const chartConfig = {
  faturamento: { label: 'Faturamento', color: 'var(--chart-1)' },
  lucro: { label: 'Lucro estimado', color: 'var(--chart-3)' },
  pecas: { label: 'Peças vendidas', color: 'var(--chart-3)' },
} satisfies ChartConfig

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const compact = (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export function AnalyticsWorkbench({ vendas, custos }: { vendas: Venda[]; custos: Record<string, number> }) {
  const [periodo, setPeriodo] = useState('180')
  const [time, setTime] = useState('todos')
  const [detalhe, setDetalhe] = useState<{ titulo: string; vendas: Venda[] } | null>(null)
  const times = useMemo(() => Array.from(new Set(vendas.flatMap(v => v.itens.map(item => item.time)))).sort(), [vendas])
  const filtradas = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() - Number(periodo))
    return vendas.filter(venda => new Date(venda.data) >= limite && new Date(venda.data) <= new Date()).map(venda => {
      if (time === 'todos') return venda
      const itens = venda.itens.filter(item => item.time === time)
      return { ...venda, itens, total: itens.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0) }
    }).filter(venda => venda.itens.length > 0)
  }, [periodo, time, vendas])

  const mensal = useMemo(() => { const count = periodo === '30' ? 4 : 6; return Array.from({ length: count }, (_, index) => {
    const inicio = new Date(); inicio.setMonth(inicio.getMonth() - (count - 1 - index), 1); inicio.setHours(0, 0, 0, 0)
    const fim = new Date(inicio); fim.setMonth(fim.getMonth() + 1)
    const grupo = filtradas.filter(v => { const data = new Date(v.data); return data >= inicio && data < fim })
    const faturamento = grupo.reduce((sum, v) => sum + Number(v.total), 0)
    const custo = grupo.reduce((sum, v) => sum + v.itens.reduce((total, item) => total + item.quantidade * (custos[item.produto_id] ?? 0), 0), 0)
    return { mes: inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), faturamento, lucro: faturamento - custo, vendas: grupo }
  }) }, [custos, filtradas, periodo])

  const diario = useMemo(() => { const count = Math.min(Number(periodo), 30); return Array.from({ length: count }, (_, index) => {
    const dia = new Date(); dia.setDate(dia.getDate() - (count - 1 - index)); dia.setHours(0, 0, 0, 0)
    const grupo = filtradas.filter(v => new Date(v.data).toDateString() === dia.toDateString())
    return { dia: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), faturamento: grupo.reduce((sum, v) => sum + Number(v.total), 0), vendas: grupo }
  }) }, [filtradas, periodo])

  const porTime = useMemo(() => {
    const mapa = new Map<string, { pecas: number; vendas: Venda[] }>()
    filtradas.forEach(venda => venda.itens.forEach(item => { const atual = mapa.get(item.time) ?? { pecas: 0, vendas: [] }; atual.pecas += item.quantidade; if (!atual.vendas.includes(venda)) atual.vendas.push(venda); mapa.set(item.time, atual) }))
    return Array.from(mapa, ([nome, dados]) => ({ time: nome, ...dados })).sort((a, b) => b.pecas - a.pecas).slice(0, 6)
  }, [filtradas])

  const total = filtradas.reduce((sum, venda) => sum + Number(venda.total), 0)

  return <section className="flex flex-col gap-5" aria-labelledby="analytics-title">
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" aria-hidden="true" /><h2 id="analytics-title" className="font-display font-bold">Análise interativa</h2></div><p className="mt-1 text-sm text-muted-foreground">Ao filtrar um time, valores e peças incluem somente seus itens. O lucro é uma estimativa pelo custo atual; custos ausentes são considerados zero, sem despesas ou frete.</p></div>
      <div className="flex flex-wrap gap-2"><Select value={periodo} onValueChange={value => value && setPeriodo(value)}><SelectTrigger className="w-36"><CalendarRange /><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem><SelectItem value="180">6 meses</SelectItem></SelectGroup></SelectContent></Select><Select value={time} onValueChange={value => value && setTime(value)}><SelectTrigger className="w-44"><Flag /><SelectValue placeholder="Todos os times" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os times</SelectItem>{times.map(nome => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</SelectGroup></SelectContent></Select>{time !== 'todos' && <Button variant="ghost" size="icon" onClick={() => setTime('todos')} aria-label="Limpar filtro"><X /></Button>}</div>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="size-4" /><span>{filtradas.length} vendas{time !== 'todos' ? ' contendo o time · receita dos itens: ' : ' · receita: '}{brl(total)}</span>{time !== 'todos' && <Badge variant="secondary">{time}</Badge>}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Faturamento e lucro</CardTitle><CardDescription>Clique em um mês para abrir as vendas que formam o valor.</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-64 w-full"><AreaChart data={mensal} onClick={state => { const index = Number(state?.activeTooltipIndex); if (Number.isInteger(index) && mensal[index]) setDetalhe({ titulo: mensal[index].mes, vendas: mensal[index].vendas }) }}><defs><linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-faturamento)" stopOpacity={.35}/><stop offset="95%" stopColor="var(--color-faturamento)" stopOpacity={.02}/></linearGradient></defs><CartesianGrid vertical={false}/><XAxis dataKey="mes" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} width={48} tickFormatter={compact}/><ChartTooltip content={<ChartTooltipContent formatter={value => brl(Number(value))}/>}/><Area dataKey="faturamento" type="monotone" stroke="var(--color-faturamento)" fill="url(#analyticsRevenue)" strokeWidth={2}/><Area dataKey="lucro" type="monotone" stroke="var(--color-lucro)" fill="transparent" strokeWidth={2}/><ChartLegend content={<ChartLegendContent/>}/></AreaChart></ChartContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Ritmo diário</CardTitle><CardDescription>Últimos {Math.min(Number(periodo), 30)} dias do filtro.</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-56 w-full"><BarChart data={diario} onClick={state => { const index = Number(state?.activeTooltipIndex); if (Number.isInteger(index) && diario[index]) setDetalhe({ titulo: diario[index].dia, vendas: diario[index].vendas }) }}><CartesianGrid vertical={false}/><XAxis dataKey="dia" tickLine={false} axisLine={false} minTickGap={24}/><YAxis tickLine={false} axisLine={false} width={42} tickFormatter={compact}/><ChartTooltip content={<ChartTooltipContent formatter={value => brl(Number(value))}/>}/><Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={[4,4,0,0]}/></BarChart></ChartContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Times em destaque</CardTitle><CardDescription>Peças vendidas no período selecionado.</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-56 w-full"><BarChart data={porTime} layout="vertical" onClick={state => { const index = Number(state?.activeTooltipIndex); if (Number.isInteger(index) && porTime[index]) setDetalhe({ titulo: porTime[index].time, vendas: porTime[index].vendas }) }}><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis dataKey="time" type="category" axisLine={false} tickLine={false} width={92}/><ChartTooltip content={<ChartTooltipContent formatter={value => `${value} peças`}/>}/><Bar dataKey="pecas" fill="var(--color-pecas)" radius={[0,4,4,0]}/></BarChart></ChartContainer></CardContent></Card>
    </div>
    <Sheet open={Boolean(detalhe)} onOpenChange={open => !open && setDetalhe(null)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Vendas · {detalhe?.titulo}</SheetTitle><SheetDescription>{detalhe?.vendas.length ?? 0} registros relacionados ao ponto selecionado.</SheetDescription></SheetHeader><div className="flex flex-col gap-3 p-4">{detalhe?.vendas.map(venda => <div key={venda.id} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><p className="font-medium">{venda.cliente || 'Cliente não informado'}</p><p className="text-xs text-muted-foreground">{new Date(venda.data).toLocaleDateString('pt-BR')} · {venda.itens.reduce((sum, item) => sum + item.quantidade, 0)} peças</p></div><div className="flex items-center gap-2"><strong>{brl(Number(venda.total))}</strong><ChevronRight className="size-4 text-muted-foreground"/></div></div>)}</div></SheetContent></Sheet>
  </section>
}
