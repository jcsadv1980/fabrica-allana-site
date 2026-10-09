'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ItemVenda, ProdutoPublico as Produto } from '@/lib/types'

const STORAGE_KEY = 'aa-sports-carrinho'

function chaveItem(produtoId: string, tamanho: string) {
  return `${produtoId}::${tamanho}`
}

export type CartItem = ItemVenda & {
  estoque_max?: number
  foto_url?: string | null
}

function limitar(quantidade: number, max?: number) {
  return typeof max === 'number' ? Math.min(quantidade, max) : quantidade
}

type CartContextValue = {
  itens: CartItem[]
  totalItens: number
  total: number
  adicionarItem: (produto: Produto, tamanho: string, quantidade: number, precoUnitario?: number) => void
  removerItem: (produtoId: string, tamanho: string) => void
  atualizarQuantidade: (produtoId: string, tamanho: string, quantidade: number) => void
  limparCarrinho: () => void
  substituirItens: (itens: CartItem[]) => void
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setItens(JSON.parse(stored))
    } catch {
      // ignore malformed cart data
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itens))
  }, [itens, hydrated])

  const adicionarItem = useCallback(
    (produto: Produto, tamanho: string, quantidade: number, precoUnitario?: number) => {
      const estoqueMax = produto.tamanhos?.find((t) => t.tamanho === tamanho)?.estoque_atual
      setItens((prev) => {
        const chave = chaveItem(produto.id, tamanho)
        const existente = prev.find((item) => chaveItem(item.produto_id, item.tamanho) === chave)
        if (existente) {
          return prev.map((item) =>
            chaveItem(item.produto_id, item.tamanho) === chave
              ? {
                  ...item,
                  estoque_max: estoqueMax ?? item.estoque_max,
                  foto_url: produto.foto_url,
                  quantidade: limitar(item.quantidade + quantidade, estoqueMax ?? item.estoque_max),
                }
              : item,
          )
        }
        return [
          ...prev,
          {
            produto_id: produto.id,
            nome: produto.nome,
            time: produto.time,
            tamanho,
            quantidade: limitar(quantidade, estoqueMax),
            preco_unitario: precoUnitario ?? produto.preco_atacado,
            estoque_max: estoqueMax,
            foto_url: produto.foto_url,
          },
        ]
      })
    },
    [],
  )

  const removerItem = useCallback((produtoId: string, tamanho: string) => {
    const chave = chaveItem(produtoId, tamanho)
    setItens((prev) => prev.filter((item) => chaveItem(item.produto_id, item.tamanho) !== chave))
  }, [])

  const atualizarQuantidade = useCallback((produtoId: string, tamanho: string, quantidade: number) => {
    const chave = chaveItem(produtoId, tamanho)
    setItens((prev) =>
      quantidade <= 0
        ? prev.filter((item) => chaveItem(item.produto_id, item.tamanho) !== chave)
        : prev.map((item) =>
            chaveItem(item.produto_id, item.tamanho) === chave
              ? { ...item, quantidade: limitar(quantidade, item.estoque_max) }
              : item,
          ),
    )
  }, [])

  const limparCarrinho = useCallback(() => setItens([]), [])

  const totalItens = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade, 0), [itens])
  const total = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0), [itens])

  const value = useMemo(
    () => ({
      itens,
      totalItens,
      total,
      adicionarItem,
      removerItem,
      atualizarQuantidade,
      limparCarrinho,
      substituirItens: setItens,
      cartOpen,
      setCartOpen,
    }),
    [itens, totalItens, total, adicionarItem, removerItem, atualizarQuantidade, limparCarrinho, cartOpen],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider')
  return context
}
