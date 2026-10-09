'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminSession, NAO_AUTORIZADO } from '@/lib/admin-guard'

const metaSchema = z.coerce.number().min(0, 'Informe um valor válido.').max(100_000_000, 'Valor muito alto.')

export async function getMetaMensal() {
  const supabase = createServiceClient()
  if (!supabase) return 0

  const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'meta_mensal').maybeSingle()
  const valor = Number((data?.valor as { valor?: number } | null)?.valor ?? 0)
  return Number.isFinite(valor) ? valor : 0
}

export async function updateMetaMensalAction(valor: number) {
  if (!(await isAdminSession())) return { error: NAO_AUTORIZADO.error }
  const parsed = metaSchema.safeParse(valor)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Valor inválido.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ chave: 'meta_mensal', valor: { valor: parsed.data }, atualizado_em: new Date().toISOString() })
  if (error) return { error: 'Não foi possível salvar a meta.' }

  revalidatePath('/admin')
  revalidatePath('/admin/tv')
  return { error: null }
}
