import Image from 'next/image'
import { ArrowDown, Factory, MessageCircle, PackageCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildWhatsAppContactUrl } from '@/lib/whatsapp'

const benefits = [
  { icon: PackageCheck, label: 'Compra por tamanho' },
  { icon: Factory, label: 'Direto da fábrica' },
  { icon: Truck, label: 'Envio para todo o Brasil' },
]

export function CatalogHero() {
  return (
    <section className="sport-texture relative isolate min-h-[540px] overflow-hidden bg-primary text-primary-foreground sm:min-h-[660px] lg:min-h-[820px]">
      <Image
        src="/images/hero.png"
        alt="Crianças jogando futebol com conjuntos infantis A&A Sports"
        fill
        priority
        sizes="100vw"
        className="-z-30 object-cover object-[67%_center] transition-transform duration-[2s] motion-safe:scale-[1.02] md:object-center"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-t from-primary via-primary/35 to-transparent md:bg-gradient-to-r md:from-primary md:via-primary/75 md:to-primary/5" />
      <div aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 w-full bg-primary/15 backdrop-blur-[2px] [mask-image:linear-gradient(to_right,black_15%,transparent_75%)] md:w-3/5 md:backdrop-blur-sm" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32 -z-10 bg-gradient-to-t from-primary/70 to-transparent" />

      <div className="mx-auto flex min-h-[540px] max-w-6xl items-end px-4 pb-6 pt-12 sm:min-h-[660px] sm:px-6 sm:pb-14 sm:pt-32 lg:min-h-[820px] lg:items-start lg:pb-20 lg:pt-44">
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-md">
            Catálogo direto da fábrica
          </span>
          <div className="flex flex-col gap-4">
            <h1 className="font-display max-w-xl text-balance text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] drop-shadow-lg sm:text-6xl lg:text-7xl">
              Futebol que veste a <span className="text-gold">paixão desde cedo.</span>
            </h1>
            <p className="max-w-lg text-pretty text-sm leading-relaxed text-primary-foreground/90 drop-shadow sm:text-lg">
              Conjuntos infantis com camisa e bermuda dos times que fazem a torcida vibrar. Escolha tamanhos, monte seu pedido e fale direto com a fábrica.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button nativeButton={false} size="lg" className="h-12 rounded-full bg-gold px-7 font-bold text-gold-foreground shadow-xl hover:bg-gold/90" render={<a href="#catalogo" />}>
              Ver conjuntos disponíveis
              <ArrowDown data-icon="inline-end" />
            </Button>
            <Button nativeButton={false} size="lg" variant="outline" className="h-12 rounded-full border-white/30 bg-white/10 px-7 text-white backdrop-blur-md hover:bg-white/20 hover:text-white" render={<a href={buildWhatsAppContactUrl('Olá! Gostaria de conhecer os conjuntos disponíveis.')} target="_blank" rel="noopener noreferrer" />}>
              <MessageCircle data-icon="inline-start" />
              Falar com a fábrica
            </Button>
          </div>
          <ul className="flex w-full flex-wrap gap-2 pt-2">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/15 px-3 py-2.5 text-xs font-semibold backdrop-blur-md">
                <Icon className="text-gold" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
