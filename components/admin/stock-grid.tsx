'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Produto, ProdutoTamanho } from '@/lib/types'

function StockBadge({ size }: { size: ProdutoTamanho }) {
  const low = size.estoque_atual <= size.estoque_minimo
  return <Badge variant={low ? 'destructive' : 'secondary'}>{size.estoque_atual} un.{size.estoque_atual === 0 ? ' · esgotado' : low ? ' · baixo' : ''}</Badge>
}

export function StockGrid({ produtos }: { produtos: Produto[] }) {
  const [busca, setBusca] = useState('')
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filtrados = produtos.filter(product => normalize(`${product.nome} ${product.time}`).includes(normalize(busca)))
  const tamanhos = useMemo(() => [...new Set(produtos.flatMap(product => (product.tamanhos ?? []).map(size => size.tamanho)))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })), [produtos])
  return <div className="flex flex-col gap-3">
    <Input aria-label="Buscar na grade de estoque" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar conjunto ou time" className="max-w-sm" />
    <div className="flex flex-col gap-3 md:hidden">{filtrados.map(product => <details key={product.id} className="rounded-xl border bg-card p-4"><summary className="min-h-11 cursor-pointer font-medium">{product.nome} · {product.time}<span className="block text-sm text-muted-foreground">{(product.tamanhos ?? []).reduce((sum, size) => sum + size.estoque_atual, 0)} peças · ver tamanhos</span></summary><ul className="mt-3 flex flex-col gap-3">{(product.tamanhos ?? []).map(size => <li key={size.id} className="flex flex-wrap items-center justify-between gap-2"><span>Tam. {size.tamanho} <span className="text-xs text-muted-foreground">(mín. {size.estoque_minimo})</span></span><StockBadge size={size} /></li>)}</ul></details>)}</div>
    <div className="hidden overflow-x-auto rounded-xl border md:block"><table className="w-full text-sm"><thead><tr className="border-b bg-muted"><th className="px-4 py-3 text-left">Produto</th>{tamanhos.map(size => <th key={size} className="px-3 py-3">{size}</th>)}<th className="px-3 py-3">Total</th></tr></thead><tbody>{filtrados.map(product => <tr key={product.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{product.nome}<p className="text-xs text-muted-foreground">{product.time}</p></td>{tamanhos.map(size => { const item = product.tamanhos?.find(item => item.tamanho === size); return <td key={size} className="px-3 py-3 text-center">{item ? <StockBadge size={item} /> : '—'}</td> })}<td className="px-3 py-3 text-center font-bold">{(product.tamanhos ?? []).reduce((sum, size) => sum + size.estoque_atual, 0)}</td></tr>)}</tbody></table></div>
    {filtrados.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
  </div>
}
