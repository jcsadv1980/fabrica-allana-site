import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  PackagePlus,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Receipt,
  TrendingUp,
  Trophy,
  Wallet,
  Sparkles,
  BarChart3,
  Tv,
} from 'lucide-react'
import { AnalyticsWorkbench } from '@/components/admin/analytics-workbench'
import { GoalCard } from '@/components/admin/goal-card'
import { getMetaMensal } from '@/app/admin/actions/meta'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Produto, Venda } from '@/lib/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function AdminDashboardPage() {
  const supabase = createServiceClient()

  const agora = new Date()
  const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const startOfPrevMonth = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const inicioPeriodo = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)

  const [produtosResult, vendasPeriodoResult, metaMensal] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, time, ativo, preco_atacado, custo, produto_tamanhos(id, tamanho, estoque_atual, estoque_minimo)'),
    supabase
      .from('vendas')
      .select('id, itens, total, data, cliente')
      .gte('data', inicioPeriodo.toISOString())
      .order('data', { ascending: false })
      .limit(5000),
    getMetaMensal(),
  ])

  const produtos = (produtosResult.data ?? []) as unknown as {
    id: string
    nome: string
    time: string
    ativo: boolean
    preco_atacado: number
    custo: number | null
    produto_tamanhos: { id: string; tamanho: string; estoque_atual: number; estoque_minimo: number }[]
  }[]
  const vendasPeriodo = (vendasPeriodoResult.data ?? []) as Venda[]
  const vendasRecentes = vendasPeriodo.slice(0, 5)
  const vendasTodas = vendasPeriodo
  const vendasMes = vendasPeriodo.filter((v) => new Date(v.data) >= startOfMonth)
  const vendasMesAnterior = vendasPeriodo.filter((v) => {
    const d = new Date(v.data)
    return d >= startOfPrevMonth && d < startOfMonth
  })

  const custoPorProduto = new Map(produtos.map((p) => [p.id, Number(p.custo ?? 0)]))
  const custoDaVenda = (venda: Venda) =>
    (venda.itens ?? []).reduce((s, item) => s + item.quantidade * (custoPorProduto.get(item.produto_id) ?? 0), 0)
  const pecasDaVenda = (venda: Venda) => (venda.itens ?? []).reduce((s, item) => s + item.quantidade, 0)

  const faturamentoAnterior = vendasMesAnterior.reduce((sum, v) => sum + Number(v.total ?? 0), 0)
  const lucroMes = vendasMes.reduce((sum, v) => sum + Number(v.total ?? 0) - custoDaVenda(v), 0)
  const pecasMes = vendasMes.reduce((sum, v) => sum + pecasDaVenda(v), 0)

  const mensal = Array.from({ length: 6 }, (_, i) => {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 5 + i, 1)
    const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1)
    const doMes = vendasPeriodo.filter((v) => {
      const d = new Date(v.data)
      return d >= inicio && d < fim
    })
    const faturamento = doMes.reduce((s, v) => s + Number(v.total ?? 0), 0)
    return {
      mes: inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      faturamento,
      lucro: faturamento - doMes.reduce((s, v) => s + custoDaVenda(v), 0),
    }
  })

  const diario = Array.from({ length: 30 }, (_, i) => {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29 + i)
    const chave = dia.toDateString()
    return {
      dia: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      faturamento: vendasPeriodo
        .filter((v) => new Date(v.data).toDateString() === chave)
        .reduce((s, v) => s + Number(v.total ?? 0), 0),
    }
  })

  const pecasPorTime = new Map<string, number>()
  for (const venda of vendasPeriodo) {
    for (const item of venda.itens ?? []) {
      pecasPorTime.set(item.time, (pecasPorTime.get(item.time) ?? 0) + item.quantidade)
    }
  }
  const porTime = Array.from(pecasPorTime, ([time, pecas]) => ({ time, pecas }))
    .sort((a, b) => b.pecas - a.pecas)
    .slice(0, 6)

  const produtosAtivos = produtos.filter((p) => p.ativo)
  const estoqueBaixo = produtos
    .flatMap((p) =>
      (p.produto_tamanhos ?? [])
        .filter((t) => t.estoque_atual <= t.estoque_minimo)
        .map((t) => ({ id: t.id, nome: p.nome, time: p.time, tamanho: t.tamanho, estoque_atual: t.estoque_atual })),
    )
  const totalVendidoMes = vendasMes.reduce((sum, v) => sum + Number(v.total ?? 0), 0)

  // Valor total do estoque (a preço de atacado e a custo)
  const valorEstoqueAtacado = produtos.reduce(
    (sum, p) => sum + (p.produto_tamanhos ?? []).reduce((s, t) => s + t.estoque_atual, 0) * Number(p.preco_atacado ?? 0),
    0,
  )
  const valorEstoqueCusto = produtos.reduce(
    (sum, p) => sum + (p.produto_tamanhos ?? []).reduce((s, t) => s + t.estoque_atual, 0) * Number(p.custo ?? 0),
    0,
  )
  const unidadesEmEstoque = produtos.reduce(
    (sum, p) => sum + (p.produto_tamanhos ?? []).reduce((s, t) => s + t.estoque_atual, 0),
    0,
  )

  // Ranking de itens mais vendidos (agregado por produto)
  const vendasPorProduto = new Map<string, { nome: string; time: string; quantidade: number; total: number }>()
  for (const venda of vendasTodas) {
    for (const item of venda.itens ?? []) {
      const atual = vendasPorProduto.get(item.produto_id) ?? {
        nome: item.nome,
        time: item.time,
        quantidade: 0,
        total: 0,
      }
      atual.quantidade += item.quantidade
      atual.total += item.quantidade * item.preco_unitario
      vendasPorProduto.set(item.produto_id, atual)
    }
  }
  const maisVendidos = Array.from(vendasPorProduto.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 6)

  const variacao =
    faturamentoAnterior > 0 ? ((totalVendidoMes - faturamentoAnterior) / faturamentoAnterior) * 100 : null
  const ticketMedio = vendasMes.length > 0 ? totalVendidoMes / vendasMes.length : 0
  const margemMes = totalVendidoMes > 0 ? (lucroMes / totalVendidoMes) * 100 : 0

  const stats: {
    label: string
    value: string | number
    hint: string
    icon: typeof Wallet
    alert?: boolean
    trend?: number | null
    accent: 'primary' | 'gold' | 'chart' | 'destructive'
  }[] = [
    {
      label: 'Faturado no mês',
      value: formatBRL(totalVendidoMes),
      hint: variacao === null ? 'sem vendas no mês anterior' : 'vs. mês anterior',
      icon: Wallet,
      trend: variacao,
      accent: 'primary',
    },
    {
      label: 'Lucro estimado',
      value: formatBRL(lucroMes),
      hint: `margem de ${margemMes.toFixed(0)}%`,
      icon: TrendingUp,
      accent: 'gold',
    },
    {
      label: 'Ticket médio',
      value: formatBRL(ticketMedio),
      hint: `${vendasMes.length} ${vendasMes.length === 1 ? 'venda' : 'vendas'} · ${pecasMes} peças`,
      icon: Receipt,
      accent: 'chart',
    },
    {
      label: 'Estoque baixo',
      value: estoqueBaixo.length,
      hint: `${produtosAtivos.length} produtos ativos`,
      icon: AlertTriangle,
      alert: estoqueBaixo.length > 0,
      accent: 'destructive',
    },
  ]

  const accentClasses: Record<(typeof stats)[number]['accent'], { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    gold: { bg: 'bg-gold/15', text: 'text-gold' },
    chart: { bg: 'bg-chart-3/15', text: 'text-chart-3' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sport-texture relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground sm:p-7">
        <Trophy className="absolute -right-6 -top-6 size-32 rotate-12 text-gold/10 sm:size-40" aria-hidden="true" />
        <div className="relative flex flex-col gap-6">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gold">
              <Sparkles className="size-3.5" />
              Painel da fábrica
            </p>
            <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Seu negócio em campo.</h1>
            <p className="mt-3 text-base font-medium">Olá, Allana. Vamos organizar o dia?</p>
            <p className="mt-1 text-sm text-primary-foreground/70">Estoque, pedidos e financeiro em um só lugar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/produtos"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-4 text-sm font-bold text-gold-foreground shadow-sm transition-transform hover:scale-[1.03]"
            >
              <PackagePlus className="size-4" />
              Cadastrar produto
            </Link>
            <Link
              href="/admin/vendas"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold transition-colors hover:bg-white/15"
            >
              <PlusCircle className="size-4" />
              Registrar venda
            </Link>
            <Link
              href="/admin/tv"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold transition-colors hover:bg-white/15"
            >
              <Tv className="size-4" />
              Modo TV
            </Link>
          </div>
        </div>
      </div>

      {estoqueBaixo.length > 0 && (
        <Link href="/admin/estoque" className="group flex items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 transition-colors hover:bg-gold/15">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-gold text-gold-foreground"><AlertTriangle className="size-5" /></span><div><p className="font-bold">{estoqueBaixo.length} tamanhos precisam de atenção</p><p className="text-sm text-muted-foreground">Veja o que precisa ser reposto antes dos próximos pedidos.</p></div></div>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const accent = accentClasses[stat.accent]
          return (
            <Card key={stat.label} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${stat.alert ? 'bg-destructive/10' : accent.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : accent.text}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${stat.alert ? 'text-destructive' : ''}`}>{stat.value}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {typeof stat.trend === 'number' && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
                        stat.trend >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {stat.trend >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                      )}
                      {Math.abs(stat.trend).toFixed(0)}%
                    </span>
                  )}
                  <span>{stat.hint}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <GoalCard faturado={totalVendidoMes} meta={metaMensal} />

      <div className="flex items-center gap-2 pt-2">
        <BarChart3 className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Desempenho</h2>
      </div>

      <AnalyticsWorkbench vendas={vendasPeriodo} custos={Object.fromEntries(custoPorProduto)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4 text-primary" />
              Valor do estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A preço de atacado</p>
                <p className="text-2xl font-bold">{formatBRL(valorEstoqueAtacado)}</p>
              </div>
              <Badge variant="secondary">{unidadesEmEstoque} un.</Badge>
            </div>
            {valorEstoqueCusto > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">Investido (a custo)</p>
                <p className="text-sm font-medium">{formatBRL(valorEstoqueCusto)}</p>
              </div>
            )}
            {valorEstoqueCusto > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Margem potencial</p>
                <p className="text-sm font-medium text-primary">{formatBRL(valorEstoqueAtacado - valorEstoqueCusto)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {maisVendidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
            ) : (
              maisVendidos.map((produto, index) => (
                <div key={`${produto.nome}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">{produto.time}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{produto.quantidade} un.</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(produto.total)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estoque baixo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {estoqueBaixo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>
            ) : (
              estoqueBaixo.slice(0, 6).map((produto) => (
                <div key={produto.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{produto.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {produto.time} · Tam. {produto.tamanho}
                    </p>
                  </div>
                  <Badge variant="destructive">{produto.estoque_atual} un.</Badge>
                </div>
              ))
            )}
            <Link href="/admin/estoque" className="text-sm font-medium text-primary hover:underline">
              Ver estoque completo →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas recentes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {vendasRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
            ) : (
              vendasRecentes.map((venda) => (
                <div key={venda.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{venda.cliente || 'Cliente não informado'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(venda.data).toLocaleDateString('pt-BR')} · {venda.itens.length} item(ns)
                    </p>
                  </div>
                  <p className="font-medium">{formatBRL(Number(venda.total))}</p>
                </div>
              ))
            )}
            <Link href="/admin/vendas" className="text-sm font-medium text-primary hover:underline">
              Ver todas as vendas →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
