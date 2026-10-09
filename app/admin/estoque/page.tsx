import { createServiceClient } from '@/lib/supabase/service'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MovimentacaoFormDialog } from '@/components/admin/movimentacao-form-dialog'
import { StockIntelligence } from '@/components/admin/stock-intelligence'
import type { MovimentacaoEstoque, Produto, Venda } from '@/lib/types'

export default async function AdminEstoquePage({ searchParams }: { searchParams: Promise<{ produto?: string; aba?: string }> }) {
  const filters = await searchParams
  const supabase = createServiceClient()

  const [produtosResult, movimentacoesResult, vendasResult] = await Promise.all([
    supabase
      .from('produtos')
      .select(
        'id, nome, time, cor, categoria, ativo, produto_tamanhos(id, produto_id, tamanho, estoque_atual, estoque_minimo)',
      )
      .order('nome', { ascending: true }),
    supabase
      .from('movimentacoes_estoque')
      .select('id, produto_id, tamanho, tipo, quantidade, motivo, data')
      .order('data', { ascending: false })
      .limit(30),
    supabase.from('vendas').select('id, itens, total, data, cliente').order('data', { ascending: false }).limit(1000),
  ])

  if (produtosResult.error || movimentacoesResult.error || vendasResult.error) throw new Error('Não foi possível carregar o estoque.')

  const produtos = ((produtosResult.data ?? []) as unknown as (Produto & {
    produto_tamanhos: Produto['tamanhos']
  })[]).map((p) => ({ ...p, tamanhos: p.produto_tamanhos ?? [] })) as Produto[]
  const movimentacoes = (movimentacoesResult.data ?? []) as MovimentacaoEstoque[]
  const vendas = (vendasResult.data ?? []) as Venda[]
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]))

  const linhas = produtos
    .flatMap((produto) =>
      (produto.tamanhos ?? []).map((t) => ({ produto, tamanho: t })),
    )
    .sort((a, b) => {
      const nome = a.produto.nome.localeCompare(b.produto.nome)
      if (nome !== 0) return nome
      return Number(a.tamanho.tamanho) - Number(b.tamanho.tamanho)
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">Controle entradas e saídas por tamanho de cada produto.</p>
        </div>
        <MovimentacaoFormDialog produtos={produtos} />
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[{ label: 'Peças disponíveis', value: linhas.reduce((sum, item) => sum + item.tamanho.estoque_atual, 0) }, { label: 'Tamanhos para repor', value: linhas.filter(item => item.tamanho.estoque_atual <= item.tamanho.estoque_minimo).length }, { label: 'Tamanhos esgotados', value: linhas.filter(item => item.tamanho.estoque_atual === 0).length }].map(item => <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="mt-3 font-display text-3xl font-bold tabular-nums">{item.value}</dd></div>)}
      </dl>
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-muted-foreground">Visão geral por tamanho</h2><p className="text-xs text-muted-foreground">Consulte rapidamente todos os conjuntos e identifique reposições.</p></div>
        </div>
        <StockIntelligence key={`${filters.produto}-${filters.aba}`} produtos={filters.produto ? produtos.filter(product => product.id === filters.produto) : produtos} vendas={vendas} initialTab={filters.aba === 'reposicao' ? 'reposicao' : 'mapa'} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Detalhamento do estoque</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tamanho / Cor</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhum produto cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map(({ produto, tamanho }) => {
                  const isLow = tamanho.estoque_atual <= tamanho.estoque_minimo
                  return (
                    <TableRow key={tamanho.id}>
                      <TableCell>
                        <p className="font-medium">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{produto.time}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Tam. {tamanho.tamanho}
                        {produto.cor ? ` · ${produto.cor}` : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isLow ? 'destructive' : 'secondary'}>{tamanho.estoque_atual} un.</Badge>
                        <div role="meter" aria-label={`Estoque do tamanho ${tamanho.tamanho}, referência: duas vezes o mínimo`} aria-valuemin={0} aria-valuemax={Math.max(tamanho.estoque_minimo * 2, tamanho.estoque_atual, 1)} aria-valuenow={tamanho.estoque_atual} className="ml-auto mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className={isLow ? 'h-full rounded-full bg-destructive' : 'h-full rounded-full bg-primary'} style={{ width: `${Math.min(100, tamanho.estoque_atual / Math.max(tamanho.estoque_minimo * 2, 1) * 100)}%` }} /></div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {tamanho.estoque_minimo} un.
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Histórico de movimentações</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhuma movimentação registrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoes.map((mov) => {
                  const produto = produtosPorId.get(mov.produto_id)
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(mov.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {produto ? `${produto.nome} (${produto.time})` : '—'}
                        {mov.tamanho ? ` · Tam. ${mov.tamanho}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === 'entrada' ? 'secondary' : 'outline'}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{mov.quantidade} un.</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{mov.motivo || '—'}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
