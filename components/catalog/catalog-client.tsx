'use client'

import { useEffect, useMemo, useState } from 'react'
import { PackageSearch, X } from 'lucide-react'
import { CatalogFilters, type Filtros } from '@/components/catalog/catalog-filters'
import { ProductCard } from '@/components/catalog/product-card'
import { Button } from '@/components/ui/button'
import type { ProdutoPublico as Produto } from '@/lib/types'

const initialFilters: Filtros = { busca: '', time: 'todos', tamanho: 'todos', ordenar: 'recentes' }

function totalStock(product: Produto) {
  return (product.tamanhos ?? []).reduce((sum, size) => sum + size.estoque_atual, 0)
}

export function CatalogClient({ produtos }: { produtos: Produto[] }) {
  const [filtros, setFiltros] = useState<Filtros>(initialFilters)
  const times = useMemo(() => Array.from(new Set(produtos.map((p) => p.time))).sort(), [produtos])
  const tamanhos = useMemo(() => Array.from(new Set(produtos.flatMap((p) => (p.tamanhos ?? []).map((t) => t.tamanho)))).sort((a, b) => Number(a) - Number(b)), [produtos])

  const [urlReady, setUrlReady] = useState(false)
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search)
      const ordenar = params.get('ordenar')
      setFiltros({ busca: params.get('busca') ?? '', time: params.get('time') ?? 'todos', tamanho: params.get('tamanho') ?? 'todos', ordenar: ordenar === 'menor-preco' || ordenar === 'maior-preco' ? ordenar : 'recentes' })
      setUrlReady(true)
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  useEffect(() => {
    if (!urlReady) return
    const timer = setTimeout(() => {
      const url = new URL(window.location.href)
      for (const key of Object.keys(initialFilters) as (keyof Filtros)[]) {
        if (filtros[key] === initialFilters[key]) url.searchParams.delete(key)
        else url.searchParams.set(key, filtros[key])
      }
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }, 250)
    return () => clearTimeout(timer)
  }, [filtros, urlReady])

  useEffect(() => {
    const resetCatalog = () => setFiltros(initialFilters)
    const setTeam = (event: Event) => setFiltros({ ...initialFilters, time: String((event as CustomEvent).detail ?? 'todos') })
    window.addEventListener('aa:reset-catalog', resetCatalog)
    window.addEventListener('aa:set-team', setTeam)
    return () => {
      window.removeEventListener('aa:reset-catalog', resetCatalog)
      window.removeEventListener('aa:set-team', setTeam)
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const query = normalize(filtros.busca.trim())
    const filtered = produtos.filter((product) => {
      if (query && !normalize(`${product.nome} ${product.time} ${product.cor ?? ''}`).includes(query)) return false
      if (filtros.time !== 'todos' && product.time !== filtros.time) return false
      if (filtros.tamanho !== 'todos' && !(product.tamanhos ?? []).some((size) => size.tamanho === filtros.tamanho && size.estoque_atual > 0)) return false
      return true
    })
    const sorted = [...filtered]
    if (filtros.ordenar === 'menor-preco') sorted.sort((a, b) => a.preco_atacado - b.preco_atacado)
    else if (filtros.ordenar === 'maior-preco') sorted.sort((a, b) => b.preco_atacado - a.preco_atacado)
    else sorted.sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
    sorted.sort((a, b) => (totalStock(a) > 0 ? 0 : 1) - (totalStock(b) > 0 ? 0 : 1))
    return sorted
  }, [produtos, filtros])

  const activeFilters = [
    filtros.busca ? { key: 'busca', label: `Busca: ${filtros.busca}` } : null,
    filtros.time !== 'todos' ? { key: 'time', label: filtros.time } : null,
    filtros.tamanho !== 'todos' ? { key: 'tamanho', label: `Tamanho ${filtros.tamanho}` } : null,
  ].filter(Boolean) as { key: keyof Filtros; label: string }[]

  function removeFilter(key: keyof Filtros) {
    setFiltros((current) => ({ ...current, [key]: key === 'busca' ? '' : 'todos' }))
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[61px] z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6"><CatalogFilters filtros={filtros} onChange={setFiltros} times={times} tamanhos={tamanhos} /></div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 scroll-mt-32 px-4 pb-28 pt-7 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Catálogo A&amp;A</p><h2 className="font-display mt-1 text-2xl font-extrabold sm:text-3xl">Conjuntos disponíveis</h2><p className="mt-1 text-sm text-muted-foreground">{filteredProducts.length} {filteredProducts.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}</p></div>
          {activeFilters.length > 0 && <Button variant="ghost" size="sm" onClick={() => setFiltros(initialFilters)}>Limpar filtros</Button>}
        </div>
        {activeFilters.length > 0 && <div className="mb-5 flex flex-wrap gap-2">{activeFilters.map((filter) => <button key={filter.key} onClick={() => removeFilter(filter.key)} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:border-primary"><span>{filter.label}</span><X className="size-3" /></button>)}</div>}

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-card py-20 text-center"><div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary"><PackageSearch className="size-6 text-muted-foreground" /></div><p className="font-display text-lg font-bold">Nenhum conjunto por aqui</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Remova um filtro para voltar a ver os modelos disponíveis.</p><Button className="mt-5" onClick={() => setFiltros(initialFilters)}>Ver todos os conjuntos</Button></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{filteredProducts.map((product, index) => <div key={product.id} className="card-reveal" style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}><ProductCard produto={product} /></div>)}</div>
        )}
      </div>
    </div>
  )
}
