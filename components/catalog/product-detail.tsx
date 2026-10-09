'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import {
  BadgePercent,
  ChevronRight,
  Factory,
  ImageOff,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/catalog/cart-context'
import { ShareProduct } from '@/components/catalog/share-product'
import { QuantityInput } from '@/components/catalog/quantity-input'
import { buildWhatsAppContactUrl } from '@/lib/whatsapp'
import { flyToCart } from '@/lib/fly-to-cart'
import type { ProdutoPublico as Produto } from '@/lib/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const garantias = [
  { icon: Factory, titulo: 'Direto da fábrica', texto: 'Produção própria, sem intermediários.' },
  { icon: BadgePercent, titulo: 'Preço de atacado', texto: 'Compre qualquer quantidade.' },
  { icon: Truck, titulo: 'Envio para todo o Brasil', texto: 'Combine o frete pelo WhatsApp.' },
]

function ProductImage({ produto, semEstoque }: { produto: Produto; semEstoque: boolean }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div
      id="produto-imagem"
      className={cn(
        'relative aspect-square overflow-hidden rounded-3xl border border-border bg-surface-tint',
        produto.foto_url && 'md:cursor-zoom-in',
      )}
      onMouseMove={produto.foto_url ? handleMove : undefined}
      onMouseLeave={() => setZoom(null)}
    >
      {produto.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={produto.foto_url}
          alt={`${produto.nome} do ${produto.time}`}
          className={cn(
            'h-full w-full object-cover transition-transform duration-200 ease-out',
            semEstoque && 'opacity-60 grayscale',
          )}
          style={
            zoom
              ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
              : undefined
          }
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="h-10 w-10" aria-hidden="true" />
          <span className="text-xs">Foto em breve</span>
        </div>
      )}
      {semEstoque && (
        <span className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white">
          Esgotado
        </span>
      )}
      <div className="absolute right-4 top-4">
        <ShareProduct produto={produto} iconOnly />
      </div>
    </div>
  )
}

export function ProductDetail({ produto }: { produto: Produto }) {
  const { adicionarItem, setCartOpen } = useCart()

  const tamanhos = useMemo(
    () => (produto.tamanhos ?? []).slice().sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    [produto.tamanhos],
  )
  const tamanhosComEstoque = tamanhos.filter((t) => t.estoque_atual > 0)
  const semEstoque = tamanhosComEstoque.length === 0
  const tamanhoUnico = tamanhosComEstoque.length === 1 ? tamanhosComEstoque[0].tamanho : null

  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string | null>(tamanhoUnico)
  const [quantidade, setQuantidade] = useState(1)
  const [avisoTamanho, setAvisoTamanho] = useState(false)

  const tamanhoAtual = tamanhos.find((t) => t.tamanho === tamanhoSelecionado) ?? null
  const estoqueMaximo = tamanhoAtual
    ? tamanhoAtual.estoque_atual
    : Math.max(0, ...tamanhosComEstoque.map((t) => t.estoque_atual))

  function handleAdicionar(abrirCarrinho: boolean) {
    if (!tamanhoSelecionado) {
      setAvisoTamanho(true)
      document.getElementById('seletor-tamanho')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast.error('Selecione um tamanho')
      return
    }
    if (!abrirCarrinho) flyToCart(document.getElementById('produto-imagem'))
    adicionarItem(produto, tamanhoSelecionado, quantidade)
    toast.success(`${produto.nome} (tam. ${tamanhoSelecionado}) adicionado ao carrinho.`, {
      action: abrirCarrinho ? undefined : { label: 'Ver carrinho', onClick: () => setCartOpen(true) },
    })
    if (abrirCarrinho) setCartOpen(true)
  }

  const subtotal = produto.preco_atacado * quantidade

  return (
    <div className="pb-24 md:pb-0">
      <nav aria-label="Navegação" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-foreground">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>{produto.time}</li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="font-medium text-foreground" aria-current="page">
            {produto.nome}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="md:sticky md:top-24 md:self-start">
          <ProductImage produto={produto} semEstoque={semEstoque} />
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {produto.time}
            {produto.cor ? ` · ${produto.cor}` : ''}
          </p>
          <h1 className="font-display mt-2 text-balance text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {produto.nome}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Conjuntinho camisa + bermuda</p>

          <div className="mt-5 flex items-end gap-2">
            <p className="font-display text-4xl font-extrabold text-primary">{formatBRL(produto.preco_atacado)}</p>
            <p className="pb-1.5 text-sm text-muted-foreground">por conjunto</p>
          </div>

          <div className="my-6 h-px bg-border" />

          <div id="seletor-tamanho" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                Tamanho
                {tamanhoSelecionado && (
                  <span className="ml-2 font-normal text-muted-foreground">selecionado: {tamanhoSelecionado}</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tamanhos.map((t) => {
                const indisponivel = t.estoque_atual <= 0
                const ativo = tamanhoSelecionado === t.tamanho
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={indisponivel}
                    aria-label={`${produto.nome}, tamanho ${t.tamanho}${indisponivel ? ', esgotado' : ''}`}
                    aria-pressed={ativo}
                    onClick={() => {
                      setTamanhoSelecionado(t.tamanho)
                      setQuantidade(1)
                      setAvisoTamanho(false)
                    }}
                    className={cn(
                      'flex h-12 min-w-12 items-center justify-center rounded-xl border-2 px-4 text-sm font-bold transition-all',
                      indisponivel &&
                        'cursor-not-allowed border-dashed border-input text-muted-foreground/50 line-through',
                      !indisponivel && ativo && 'border-primary bg-primary text-primary-foreground shadow-md',
                      !indisponivel && !ativo && 'border-input bg-card text-foreground hover:border-primary',
                      !indisponivel && !ativo && avisoTamanho && 'border-destructive/60',
                    )}
                  >
                    {t.tamanho}
                  </button>
                )
              })}
            </div>
            <p role="status" className="mt-2 min-h-5 text-sm font-medium text-destructive">
              {avisoTamanho ? 'Selecione um tamanho para continuar' : ''}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center rounded-xl border-2 border-input bg-card">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                className="flex h-12 w-12 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={semEstoque || quantidade <= 1}
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <QuantityInput
                value={quantidade}
                onChange={setQuantidade}
                max={estoqueMaximo}
                disabled={semEstoque}
                className="h-10 w-12 text-base"
              />
              <button
                type="button"
                aria-label="Aumentar quantidade"
                className="flex h-12 w-12 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={semEstoque || quantidade >= estoqueMaximo}
                onClick={() => setQuantidade((q) => Math.min(estoqueMaximo, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Subtotal</p>
              <p className="font-display text-lg font-extrabold tabular-nums text-foreground">{formatBRL(subtotal)}</p>
            </div>
          </div>

          <div className="mt-5 hidden flex-col gap-3 md:flex">
            <Button size="lg" className="h-13 text-base" disabled={semEstoque} onClick={() => handleAdicionar(false)}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              {semEstoque ? 'Esgotado' : 'Adicionar ao carrinho'}
            </Button>
            <Button size="lg" variant="secondary" disabled={semEstoque} onClick={() => handleAdicionar(true)}>
              Adicionar e ver carrinho
            </Button>
          </div>

          <a
            href={buildWhatsAppContactUrl(`Olá! Tenho uma dúvida sobre o ${produto.nome} (${produto.time}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[#25D366]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C4B]">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm">
              <span className="block font-bold text-foreground">Ficou com dúvida?</span>
              <span className="text-muted-foreground">Fale com a gente no WhatsApp sobre este modelo</span>
            </span>
          </a>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            {garantias.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-3 rounded-2xl bg-secondary p-4 lg:flex-col lg:gap-2">
                <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-foreground">{titulo}</p>
                  <p className="text-xs text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {tamanhoSelecionado ? `Tam. ${tamanhoSelecionado} · ${quantidade}x` : 'Escolha o tamanho'}
            </p>
            <p className="font-display text-lg font-extrabold tabular-nums text-foreground">{formatBRL(subtotal)}</p>
          </div>
          <Button size="lg" className="ml-auto flex-1" disabled={semEstoque} onClick={() => handleAdicionar(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {semEstoque ? 'Esgotado' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
