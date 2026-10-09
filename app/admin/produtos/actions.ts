'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminSession, NAO_AUTORIZADO } from '@/lib/admin-guard'

const tamanhoSchema = z.object({
  tamanho: z.string().trim().min(1),
  estoque_atual: z.coerce.number().int().min(0),
  estoque_minimo: z.coerce.number().int().min(0),
})

const produtoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do produto.'),
  time: z.string().trim().min(2, 'Informe o time.'),
  cor: z.string().trim().optional(),
  categoria: z.enum(['Conjuntinho', 'Camisa', 'Bermuda']),
  preco_atacado: z.coerce.number().positive('Informe um preço maior que zero.'),
  custo: z.coerce.number().min(0).optional(),
  ativo: z.coerce.boolean(),
})

export type ProdutoFormState = { error: string | null; success: boolean; fieldErrors?: Record<string, string[]> }

function parseTamanhos(raw: FormDataEntryValue | null) {
  if (!raw) return []
  try {
    const arr = JSON.parse(String(raw)) as unknown[]
    const parsed = z.array(tamanhoSchema).safeParse(arr)
    if (!parsed.success) return null
    // Remove duplicados por tamanho, mantendo o último
    const map = new Map<string, z.infer<typeof tamanhoSchema>>()
    for (const t of parsed.data) map.set(t.tamanho, t)
    return Array.from(map.values())
  } catch {
    return null
  }
}

export async function createProdutoAction(
  _prevState: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  if (!(await isAdminSession())) return NAO_AUTORIZADO
  const parsed = produtoSchema.safeParse({
    nome: formData.get('nome'),
    time: formData.get('time'),
    cor: formData.get('cor') || undefined,
    categoria: formData.get('categoria'),
    preco_atacado: formData.get('preco_atacado'),
    custo: formData.get('custo') || undefined,
    ativo: formData.get('ativo') === 'on' || formData.get('ativo') === 'true',
  })

  if (!parsed.success) {
    return { error: 'Revise os campos destacados.', success: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const tamanhos = parseTamanhos(formData.get('tamanhos'))
  if (tamanhos === null) return { error: 'Tamanhos inválidos.', success: false }
  if (tamanhos.length === 0) return { error: 'Adicione ao menos um tamanho.', success: false, fieldErrors: { tamanhos: ['Selecione ao menos um tamanho.'] } }

  try {
    const fotoUrl = String(formData.get('foto_url') ?? '') || null
    const supabase = createServiceClient()
    const { data: produto, error } = await supabase
      .from('produtos')
      .insert({
        ...parsed.data,
        cor: parsed.data.cor || null,
        custo: parsed.data.custo ?? null,
        foto_url: fotoUrl,
      })
      .select('id')
      .single()

    if (error || !produto) {
      console.log('[v0] createProdutoAction error:', error?.message)
      return { error: 'Não foi possível salvar o produto.', success: false }
    }

    const { error: tamErr } = await supabase.from('produto_tamanhos').insert(
      tamanhos.map((t) => ({
        produto_id: produto.id,
        tamanho: t.tamanho,
        estoque_atual: t.estoque_atual,
        estoque_minimo: t.estoque_minimo,
      })),
    )

    if (tamErr) {
      console.log('[v0] createProdutoAction tamanhos error:', tamErr.message)
      // Reverte o produto para não deixar registro órfão sem tamanhos
      await supabase.from('produtos').delete().eq('id', produto.id)
      return { error: 'Não foi possível salvar os tamanhos.', success: false }
    }
  } catch (err) {
    console.log('[v0] createProdutoAction exception:', err)
    return { error: 'Não foi possível salvar o produto.', success: false }
  }

  revalidatePath('/admin/produtos')
  revalidatePath('/admin/estoque')
  revalidatePath('/')
  return { error: null, success: true }
}

export async function updateProdutoAction(
  _prevState: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  if (!(await isAdminSession())) return NAO_AUTORIZADO
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Produto inválido.', success: false }

  const parsed = produtoSchema.safeParse({
    nome: formData.get('nome'),
    time: formData.get('time'),
    cor: formData.get('cor') || undefined,
    categoria: formData.get('categoria'),
    preco_atacado: formData.get('preco_atacado'),
    custo: formData.get('custo') || undefined,
    ativo: formData.get('ativo') === 'on' || formData.get('ativo') === 'true',
  })

  if (!parsed.success) {
    return { error: 'Revise os campos destacados.', success: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const tamanhos = parseTamanhos(formData.get('tamanhos'))
  if (tamanhos === null) return { error: 'Tamanhos inválidos.', success: false }
  if (tamanhos.length === 0) return { error: 'Adicione ao menos um tamanho.', success: false, fieldErrors: { tamanhos: ['Selecione ao menos um tamanho.'] } }

  try {
    const fotoUrl = String(formData.get('foto_url') ?? '') || null
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('produtos')
      .update({
        ...parsed.data,
        cor: parsed.data.cor || null,
        custo: parsed.data.custo ?? null,
        foto_url: fotoUrl,
      })
      .eq('id', id)

    if (error) {
      console.log('[v0] updateProdutoAction error:', error.message)
      return { error: 'Não foi possível atualizar o produto.', success: false }
    }

    // Sincroniza os tamanhos: upsert dos enviados e remove os que saíram
    const { error: upsertErr } = await supabase.from('produto_tamanhos').upsert(
      tamanhos.map((t) => ({
        produto_id: id,
        tamanho: t.tamanho,
        estoque_atual: t.estoque_atual,
        estoque_minimo: t.estoque_minimo,
      })),
      { onConflict: 'produto_id,tamanho' },
    )

    if (upsertErr) {
      console.log('[v0] updateProdutoAction upsert tamanhos error:', upsertErr.message)
      return { error: 'Não foi possível atualizar os tamanhos.', success: false }
    }

    const tamanhosMantidos = tamanhos.map((t) => t.tamanho)
    const { error: delErr } = await supabase
      .from('produto_tamanhos')
      .delete()
      .eq('produto_id', id)
      .not('tamanho', 'in', `(${tamanhosMantidos.map((t) => `"${t}"`).join(',')})`)

    if (delErr) {
      console.log('[v0] updateProdutoAction delete tamanhos error:', delErr.message)
    }
  } catch (err) {
    console.log('[v0] updateProdutoAction exception:', err)
    return { error: 'Não foi possível atualizar o produto.', success: false }
  }

  revalidatePath('/admin/produtos')
  revalidatePath('/admin/estoque')
  revalidatePath('/')
  return { error: null, success: true }
}

export async function deleteProdutoAction(id: string) {
  if (!(await isAdminSession())) return { error: NAO_AUTORIZADO.error }
  const supabase = createServiceClient()
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) {
    console.log('[v0] deleteProdutoAction error:', error.message)
    return { error: 'Não foi possível excluir o produto.' }
  }
  revalidatePath('/admin/produtos')
  revalidatePath('/admin/estoque')
  revalidatePath('/')
  return { error: null }
}

export async function toggleAtivoAction(id: string, ativo: boolean) {
  if (!(await isAdminSession())) return { error: NAO_AUTORIZADO.error }
  const supabase = createServiceClient()
  const { error } = await supabase.from('produtos').update({ ativo }).eq('id', id)
  if (error) {
    console.log('[v0] toggleAtivoAction error:', error.message)
    return { error: 'Não foi possível atualizar o status.' }
  }
  revalidatePath('/admin/produtos')
  revalidatePath('/')
  return { error: null }
}
