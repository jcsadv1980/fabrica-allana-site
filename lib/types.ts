export type Categoria = 'Conjuntinho' | 'Camisa' | 'Bermuda'

export type ProdutoTamanho = {
  id: string
  produto_id: string
  tamanho: string
  estoque_atual: number
  estoque_minimo: number
  criado_em?: string
}

export type Produto = {
  id: string
  nome: string
  time: string
  cor: string | null
  categoria: Categoria
  preco_atacado: number
  custo: number | null
  foto_url: string | null
  ativo: boolean
  criado_em: string
  tamanhos?: ProdutoTamanho[]
}

export type ProdutoPublico = Omit<Produto, 'custo'>

export type TipoMovimentacao = 'entrada' | 'saida'

export type MovimentacaoEstoque = {
  id: string
  produto_id: string
  tamanho: string | null
  tipo: TipoMovimentacao
  quantidade: number
  motivo: string | null
  data: string
}

export type ItemVenda = {
  produto_id: string
  nome: string
  time: string
  tamanho: string
  quantidade: number
  preco_unitario: number
}

export type Venda = {
  id: string
  itens: ItemVenda[]
  total: number
  data: string
  cliente: string | null
}

// Tamanhos disponíveis: 0 a 14
export const TAMANHOS_DISPONIVEIS = Array.from({ length: 15 }, (_, i) => String(i))
