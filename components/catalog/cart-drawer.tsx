'use client'

import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCart, type CartItem } from '@/components/catalog/cart-context'
import { CartCheckout } from '@/components/catalog/cart-checkout'
import { CART_TRIGGER_ID } from '@/lib/fly-to-cart'
import { QuantityInput } from '@/components/catalog/quantity-input'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CartLine({ item }: { item: CartItem }) {
  const { atualizarQuantidade, removerItem } = useCart()
  const noLimite = typeof item.estoque_max === 'number' && item.quantidade >= item.estoque_max

  return (
    <li className="flex gap-3 border-b border-border py-4 last:border-b-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {item.foto_url ? (
          <img src={item.foto_url || '/placeholder.svg'} alt={item.nome} className="size-full object-cover" />
        ) : (
          <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-pretty">{item.nome}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.time} · Tam. {item.tamanho}
            </p>
          </div>
          {item.quantidade > 1 && (
            <button
              type="button"
              aria-label={`Remover ${item.nome} do carrinho`}
              onClick={() => removerItem(item.produto_id, item.tamanho)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center rounded-md border border-input">
            <button
              type="button"
              aria-label={`Diminuir ${item.nome}, tamanho ${item.tamanho}`}
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => atualizarQuantidade(item.produto_id, item.tamanho, item.quantidade - 1)}
            >
              {item.quantidade === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
            </button>
            <QuantityInput
              value={item.quantidade}
              onChange={(q) => atualizarQuantidade(item.produto_id, item.tamanho, q)}
              max={item.estoque_max}
              label={`Quantidade de ${item.nome}`}
              className="h-7 w-9 text-sm font-medium"
            />
            <button
              type="button"
              aria-label={`Aumentar ${item.nome}, tamanho ${item.tamanho}`}
              disabled={noLimite}
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => atualizarQuantidade(item.produto_id, item.tamanho, item.quantidade + 1)}
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-display text-sm font-bold text-primary tabular-nums">
              {formatBRL(item.quantidade * item.preco_unitario)}
            </p>
            {item.quantidade > 1 && (
              <p className="text-xs text-muted-foreground tabular-nums">{formatBRL(item.preco_unitario)} cada</p>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export function CartDrawer() {
  const { itens, total, totalItens, limparCarrinho, cartOpen, setCartOpen } = useCart()

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetTrigger
        render={
          <Button
            id={CART_TRIGGER_ID}
            variant="outline"
            aria-label={totalItens > 0 ? `Abrir carrinho com ${totalItens} ${totalItens === 1 ? 'peça' : 'peças'}, total ${formatBRL(total)}` : 'Abrir carrinho'}
            className="relative h-11 rounded-full border-current/15 bg-current/5 px-3 sm:px-4"
          />
        }
      >
        <ShoppingBag data-icon="inline-start" />
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-65">{totalItens > 0 ? `${totalItens} ${totalItens === 1 ? 'peça' : 'peças'}` : 'Carrinho'}</span>
          <span className="mt-1 text-xs font-extrabold tabular-nums">{totalItens > 0 ? formatBRL(total) : 'Seu pedido'}</span>
        </span>
        {totalItens > 0 && (
          <span
            key={totalItens}
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-extrabold text-gold-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300 sm:hidden"
          >
            {totalItens}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Seu pedido</SheetTitle>
          <SheetDescription>
            {totalItens > 0
              ? `${totalItens} ${totalItens === 1 ? 'peça' : 'peças'} · revise antes de enviar pelo WhatsApp.`
              : 'Revise os itens antes de enviar o pedido pelo WhatsApp.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Seu carrinho está vazio</p>
              <Button variant="outline" size="sm" onClick={() => setCartOpen(false)}>
                Ver conjuntos
              </Button>
            </div>
          ) : (
            <ul>
              {itens.map((item) => (
                <CartLine key={`${item.produto_id}-${item.tamanho}`} item={item} />
              ))}
            </ul>
          )}
        </div>

        {itens.length > 0 && (
          <SheetFooter className="flex-col gap-3 border-t border-border pt-4">
            <dl className="flex flex-col gap-1.5 rounded-2xl bg-secondary p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Peças</dt>
                <dd className="font-semibold tabular-nums">{totalItens}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Frete</dt>
                <dd className="font-semibold">Combinado no WhatsApp</dd>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                <dt className="font-bold">Total</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums text-primary">{formatBRL(total)}</dd>
              </div>
            </dl>
            <CartCheckout />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
