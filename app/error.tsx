'use client'

import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 className="font-display text-2xl font-bold">Não foi possível carregar os dados</h1>
    <p className="text-muted-foreground">O serviço está temporariamente indisponível. Isso não significa que não há produtos ou vendas.</p>
    <Button onClick={reset}>Tentar novamente</Button>
  </main>
}
