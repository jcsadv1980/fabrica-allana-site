import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/catalog/site-header'
import { CartProvider } from '@/components/catalog/cart-context'
import { WhatsAppFab } from '@/components/catalog/whatsapp-fab'
import { ProductDetail } from '@/components/catalog/product-detail'
import type { ProdutoPublico as Produto } from '@/lib/types'

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produtos')
    .select(
      'id, nome, time, cor, categoria, preco_atacado, foto_url, ativo, criado_em, produto_tamanhos(id, produto_id, tamanho, estoque_atual, estoque_minimo)',
    )
    .eq('id', id)
    .eq('ativo', true)
    .maybeSingle()

  if (error) {
    console.error('Falha ao carregar produto:', error.code)
    throw new Error('Não foi possível carregar o produto.')
  }

  if (!data) {
    notFound()
  }

  const raw = data as unknown as Produto & { produto_tamanhos: Produto['tamanhos'] }
  const produto: Produto = { ...raw, tamanhos: raw.produto_tamanhos ?? [] }

  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
          <ProductDetail produto={produto} />
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          A&amp;A Sports · Preços exclusivos para revenda no atacado
        </footer>
        <WhatsAppFab alwaysRaisedOnMobile />
      </div>
    </CartProvider>
  )
}
