'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CartItem } from '@/components/catalog/cart-context'

const cartSchema = z.array(z.object({ produto_id: z.string().uuid(), tamanho: z.string().min(1).max(40), quantidade: z.number().int().positive().max(10000) })).min(1).max(100)

export async function reviewCart(input: unknown): Promise<{ error: string | null; itens: CartItem[] }> {
  const parsed = cartSchema.safeParse(input)
  if (!parsed.success) return { error: 'Revise os itens e informe quantidades inteiras válidas.', itens: [] }
  const aggregated = new Map<string, z.infer<typeof cartSchema>[number]>()
  for (const item of parsed.data) {
    const key = `${item.produto_id}:${item.tamanho}`
    const previous = aggregated.get(key)
    const quantidade = (previous?.quantidade ?? 0) + item.quantidade
    if (quantidade > 10000) return { error: 'Quantidade acima do limite por tamanho.', itens: [] }
    aggregated.set(key, { ...item, quantidade })
  }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('produtos').select('id, nome, time, foto_url, preco_atacado, produto_tamanhos(tamanho, estoque_atual)').eq('ativo', true).in('id', [...new Set(parsed.data.map(item => item.produto_id))])
    if (error) throw new Error('Consulta indisponível')
    const itens: CartItem[] = []
    for (const item of aggregated.values()) {
      const product = data?.find(product => product.id === item.produto_id)
      const size = product?.produto_tamanhos.find(size => size.tamanho === item.tamanho)
      if (!product || !size || size.estoque_atual <= 0) continue
      itens.push({ produto_id: product.id, nome: product.nome, time: product.time, foto_url: product.foto_url, tamanho: item.tamanho, quantidade: Math.min(item.quantidade, size.estoque_atual), estoque_max: size.estoque_atual, preco_unitario: Number(product.preco_atacado) })
    }
    return { error: null, itens }
  } catch {
    return { error: 'Não foi possível conferir preços e estoque. Seu carrinho foi preservado; tente novamente.', itens: [] }
  }
}
