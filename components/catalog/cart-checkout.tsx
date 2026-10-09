'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useCart, type CartItem } from './cart-context'
import { reviewCart } from '@/app/cart-actions'
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp'

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function CartCheckout() {
  const { itens, limparCarrinho, substituirItens } = useCart()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState<{ source: string; itens: CartItem[]; checkedAt: number } | null>(null)
  const valid = review?.source === JSON.stringify(itens)
  const changes = valid ? itens.flatMap(item => {
    const next = review.itens.find(next => next.produto_id === item.produto_id && next.tamanho === item.tamanho)
    const label = `${item.nome} · tamanho ${item.tamanho}`
    if (!next) return [`${label}: indisponível, será removido.`]
    return [next.quantidade !== item.quantidade ? `${label}: quantidade de ${item.quantidade} para ${next.quantidade}.` : '', next.preco_unitario !== item.preco_unitario ? `${label}: preço de ${brl(item.preco_unitario)} para ${brl(next.preco_unitario)}.` : ''].filter(Boolean)
  }) : []

  async function check() {
    setPending(true)
    setError('')
    const source = JSON.stringify(itens)
    try {
      const result = await reviewCart(itens)
      if (result.error) { setError(result.error); setReview(null) }
      else setReview({ source, itens: result.itens, checkedAt: Date.now() })
    } catch { setError('Falha na conexão. Seu pedido foi preservado; tente novamente.') }
    finally { setPending(false) }
  }

  return <div className="flex flex-col gap-3">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {valid && changes.length > 0 && <div role="status" className="flex flex-col gap-2 rounded-xl border p-3 text-sm"><p className="font-bold">Seu pedido precisa de revisão</p><ul className="list-disc pl-4">{changes.map(change => <li key={change}>{change}</li>)}</ul><Button variant="secondary" onClick={() => { substituirItens(review.itens); setReview(null) }}>Aceitar alterações e revisar novamente</Button></div>}
    {valid && changes.length === 0 ? <Button nativeButton={false} size="lg" render={<a href={buildWhatsAppOrderUrl(review.itens, review.itens.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0))} target="_blank" rel="noopener noreferrer" onClick={event => { if (Date.now() - review.checkedAt > 60000) { event.preventDefault(); setReview(null); setError('A conferência expirou. Confira o pedido novamente antes de enviar.') } }} />}>Enviar pedido no WhatsApp</Button> : <Button size="lg" onClick={check} disabled={pending}>{pending ? 'Conferindo preços e estoque…' : 'Conferir pedido para WhatsApp'}</Button>}
    <p className="text-xs text-muted-foreground">A conferência não reserva estoque. Disponibilidade e frete serão confirmados pela fábrica.</p>
    <AlertDialog><AlertDialogTrigger render={<Button variant="ghost" />}>Esvaziar carrinho</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Esvaziar seu carrinho?</AlertDialogTitle><AlertDialogDescription>Todos os itens serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Manter pedido</AlertDialogCancel><AlertDialogAction onClick={limparCarrinho}>Esvaziar carrinho</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
