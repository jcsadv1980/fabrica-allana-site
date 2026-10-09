'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ImageOff, Minus, Plus, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useCart } from '@/components/catalog/cart-context'
import { ShareProduct } from '@/components/catalog/share-product'
import { QuantityInput } from '@/components/catalog/quantity-input'
import { flyToCart } from '@/lib/fly-to-cart'
import type { ProdutoPublico as Produto } from '@/lib/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProductCard({ produto }: { produto: Produto }) {
  const { adicionarItem, setCartOpen } = useCart()
  const imagemRef = useRef<HTMLDivElement>(null)

  const tamanhosComEstoque = useMemo(
    () =>
      (produto.tamanhos ?? [])
        .filter((t) => t.estoque_atual > 0)
        .sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    [produto.tamanhos],
  )

  const semEstoque = tamanhosComEstoque.length === 0
  const estoqueTotal = tamanhosComEstoque.reduce((sum, tamanho) => sum + tamanho.estoque_atual, 0)
  const ultimasUnidades = estoqueTotal > 0 && estoqueTotal <= 8
  const tamanhoUnico = tamanhosComEstoque.length === 1 ? tamanhosComEstoque[0].tamanho : null

  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string | null>(tamanhoUnico)
  const [quantidade, setQuantidade] = useState(1)

  const tamanhoAtual = tamanhosComEstoque.find((t) => t.tamanho === tamanhoSelecionado) ?? null
  const estoqueDoTamanho = tamanhoAtual?.estoque_atual ?? 0
  const estoqueMaximo = tamanhoAtual
    ? estoqueDoTamanho
    : Math.max(0, ...tamanhosComEstoque.map((t) => t.estoque_atual))

  const [imagemCarregada, setImagemCarregada] = useState(false)
  const [avisoTamanho, setAvisoTamanho] = useState(false)
  const avisoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function mostrarAvisoTamanho() {
    if (avisoTimeout.current) clearTimeout(avisoTimeout.current)
    setAvisoTamanho(true)
    avisoTimeout.current = setTimeout(() => setAvisoTamanho(false), 2500)
  }

  function handleAdicionar() {
    if (!tamanhoSelecionado) {
      mostrarAvisoTamanho()
      return
    }
    flyToCart(imagemRef.current)
    adicionarItem(produto, tamanhoSelecionado, quantidade)
    setQuantidade(1)
    setTamanhoSelecionado(tamanhoUnico)
    toast.success(`${produto.nome} (tam. ${tamanhoSelecionado}) adicionado ao carrinho.`, {
      action: { label: 'Ver carrinho', onClick: () => setCartOpen(true) },
    })
  }

  return (
    <Card className="group flex flex-col overflow-hidden rounded-3xl border-border/80 bg-card py-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-xl hover:shadow-primary/10">
      <div ref={imagemRef} className={cn('relative aspect-[4/5] overflow-hidden bg-surface-tint', produto.foto_url && !imagemCarregada && 'shimmer')}>
        <Link
          href={`/produto/${produto.id}`}
          className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`Ver detalhes de ${produto.nome} do ${produto.time}`}
        >
          {produto.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.foto_url || '/placeholder.svg'}
              alt={`${produto.nome} do ${produto.time}`}
              loading="lazy"
              ref={(node) => { if (node?.complete && node.naturalWidth > 0) setImagemCarregada(true) }}
              onLoad={() => setImagemCarregada(true)}
              className={cn('h-full w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.035]', imagemCarregada ? (semEstoque ? 'opacity-60' : 'opacity-100') : 'opacity-0')}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </Link>
        <div className="absolute right-2 top-2">
          <ShareProduct
            produto={produto}
            variant="secondary"
            iconOnly
            className="h-8 w-8 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
          />
        </div>
        {ultimasUnidades && (
          <Badge className="absolute left-3 top-3 border-0 bg-gold text-gold-foreground shadow-sm">Últimas unidades</Badge>
        )}
        {semEstoque && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
            <Badge
              variant="destructive"
              className="-rotate-12 border-transparent bg-foreground/90 px-4 py-1 text-sm font-bold uppercase tracking-wide text-background"
            >
              Esgotado
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-1 px-4 pt-4">
        <Link href={`/produto/${produto.id}`} className="hover:underline">
          <h3 className="font-display font-bold leading-tight text-foreground">{produto.nome}</h3>
        </Link>
        <p className="text-sm text-muted-foreground">
          {produto.time}
          {produto.cor ? ` · ${produto.cor}` : ''}
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="font-display text-xl font-extrabold text-primary">{formatBRL(produto.preco_atacado)}</p>
          <span className="pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">o conjunto</span>
        </div>

        {!semEstoque && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tamanho</p>
            <div className="flex flex-wrap gap-1.5">
              {tamanhosComEstoque.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`${produto.nome}, tamanho ${t.tamanho}`}
                  aria-pressed={tamanhoSelecionado === t.tamanho}
                  onClick={() => {
                    setTamanhoSelecionado(t.tamanho)
                    setQuantidade(1)
                    setAvisoTamanho(false)
                  }}
                  className={cn(
                    'flex h-11 min-w-11 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors',
                    tamanhoSelecionado === t.tamanho
                      ? 'border-primary bg-primary text-primary-foreground'
                      : avisoTamanho
                        ? 'border-destructive text-foreground hover:border-primary'
                        : 'border-input text-foreground hover:border-primary',
                  )}
                >
                  {t.tamanho}
                </button>
              ))}
            </div>
            <p
              role="status"
              aria-live="polite"
              className={cn(
                'mt-1.5 text-xs font-medium text-destructive transition-opacity duration-300',
                avisoTamanho ? 'opacity-100' : 'opacity-0',
              )}
            >
              {avisoTamanho ? 'Selecione um tamanho' : '\u00A0'}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 px-3 pt-0 sm:px-4">
        <div className="flex items-center justify-between rounded-md border border-input sm:justify-start">
          <button
            type="button"
            aria-label={`Diminuir ${produto.nome}, tamanho ${tamanhoSelecionado ?? 'não selecionado'}`}
            className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={semEstoque}
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <QuantityInput
            value={quantidade}
            onChange={setQuantidade}
            max={estoqueMaximo}
            disabled={semEstoque}
            className="h-8 w-9 text-sm font-medium"
          />
          <button
            type="button"
            aria-label={`Aumentar ${produto.nome}, tamanho ${tamanhoSelecionado ?? 'não selecionado'}`}
            className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={semEstoque}
            onClick={() => setQuantidade((q) => Math.min(estoqueMaximo, q + 1))}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button className="w-full sm:w-auto sm:flex-1" disabled={semEstoque} onClick={handleAdicionar}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  )
}
