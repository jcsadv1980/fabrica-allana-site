'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, Pencil, ImagePlus, Copy, Loader2 } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createProdutoAction, updateProdutoAction, type ProdutoFormState } from '@/app/admin/produtos/actions'
import type { Produto } from '@/lib/types'

const initialState: ProdutoFormState = { error: null, success: false }

const TAMANHOS_DISPONIVEIS = ['0', '2', '4', '6', '8', '10', '12', '14']
const ESTOQUE_MINIMO_PADRAO = 3

type TamanhoEstado = { tamanho: string; ativo: boolean; estoque_atual: number; estoque_minimo: number }

function SubmitButton({ isEdit, disabled }: { isEdit: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar produto'}
    </Button>
  )
}

const inputTouch = 'h-11 text-base sm:h-9 sm:text-sm'
const selectTouch =
  'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-9 sm:text-sm'

function centsToBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CurrencyField({
  id,
  name,
  label,
  defaultValue,
  required,
  errors,
}: {
  id: string
  name: string
  label: string
  defaultValue?: number | string | null
  required?: boolean
  errors?: string[]
}) {
  const initialCents = defaultValue ? Math.round(Number(defaultValue) * 100) : 0
  const [cents, setCents] = useState(initialCents)
  const [touched, setTouched] = useState(false)
  const displayValue = touched || cents > 0 ? `R$ ${centsToBRL(cents)}` : ''

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        required={required}
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        inputMode="numeric"
        placeholder="R$ 0,00"
        className={inputTouch}
        value={displayValue}
        onChange={(event) => {
          const digitsOnly = event.target.value.replace(/\D/g, '')
          setTouched(true)
          setCents(digitsOnly ? Number.parseInt(digitsOnly, 10) : 0)
        }}
      />
      <input type="hidden" name={name} value={(cents / 100).toFixed(2)} />
      <FieldError id={`${id}-error`} errors={errors?.map(message => ({ message }))} />
    </Field>
  )
}

function buildEstadoInicial(base?: Produto): TamanhoEstado[] {
  const existentes = new Map((base?.tamanhos ?? []).map((t) => [t.tamanho, t]))
  // Keeps legacy odd sizes already saved on a product so editing never drops their stock
  const lista = Array.from(new Set([...TAMANHOS_DISPONIVEIS, ...existentes.keys()])).sort(
    (a, b) => Number(a) - Number(b),
  )
  return lista.map((tamanho) => {
    const existente = existentes.get(tamanho)
    return {
      tamanho,
      ativo: Boolean(existente),
      estoque_atual: existente?.estoque_atual ?? 0,
      estoque_minimo: existente?.estoque_minimo ?? ESTOQUE_MINIMO_PADRAO,
    }
  })
}

export function ProdutoFormDialog({ produto, duplicarDe }: { produto?: Produto; duplicarDe?: Produto }) {
  const isEdit = Boolean(produto)
  const isDuplicado = Boolean(duplicarDe) && !isEdit
  const base = produto ?? duplicarDe
  const action = isEdit ? updateProdutoAction : createProdutoAction
  const [state, formAction] = useActionState(action, initialState)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(base?.foto_url ?? null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(base?.foto_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [tamanhos, setTamanhos] = useState<TamanhoEstado[]>(() => buildEstadoInicial(base))
  const formRef = useRef<HTMLFormElement>(null)

  const tamanhosAtivos = useMemo(() => tamanhos.filter((t) => t.ativo), [tamanhos])

  const tamanhosPayload = useMemo(
    () =>
      JSON.stringify(
        tamanhosAtivos.map((t) => ({
          tamanho: t.tamanho,
          estoque_atual: t.estoque_atual,
          estoque_minimo: t.estoque_minimo,
        })),
      ),
    [tamanhosAtivos],
  )

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? 'Produto atualizado.' : 'Produto cadastrado.')
      setOpen(false)
      formRef.current?.reset()
      setPreview(base?.foto_url ?? null)
      setFotoUrl(base?.foto_url ?? null)
      setTamanhos(buildEstadoInicial(base))
    } else if (state.error) {
      toast.error(state.error)
      const first = Object.keys(state.fieldErrors ?? {})[0]
      const target = first ? formRef.current?.querySelector<HTMLElement>(`[id="${first}"]`) : formRef.current?.querySelector<HTMLElement>('[role="alert"]')
      target?.focus()
    }
  }, [state, isEdit, base])

  function toggleTamanho(tamanho: string) {
    setTamanhos((prev) =>
      prev.map((t) => (t.tamanho === tamanho ? { ...t, ativo: !t.ativo } : t)),
    )
  }

  function setEstoque(tamanho: string, valor: number) {
    setTamanhos((prev) =>
      prev.map((t) => (t.tamanho === tamanho ? { ...t, estoque_atual: Math.max(0, valor) } : t)),
    )
  }

  function setEstoqueMinimo(tamanho: string, valor: number) {
    setTamanhos((prev) =>
      prev.map((t) => (t.tamanho === tamanho ? { ...t, estoque_minimo: Math.max(0, valor) } : t)),
    )
  }

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10 MB.')
      event.target.value = ''
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const extension = file.name.split('.').pop() || 'jpg'
      const blob = await upload(`produtos/${crypto.randomUUID()}.${extension}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setFotoUrl(blob.url)
    } catch (err) {
      console.log('[v0] foto upload error:', err)
      toast.error('Não foi possível enviar a foto. Tente novamente.')
      setPreview(base?.foto_url ?? null)
      event.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="icon" aria-label="Editar produto" />
          ) : isDuplicado ? (
            <Button variant="ghost" size="sm" aria-label="Duplicar produto" />
          ) : (
            <Button />
          )
        }
      >
        {isEdit ? (
          <Pencil className="h-4 w-4" />
        ) : isDuplicado ? (
          <>
            <Copy className="mr-1.5 h-4 w-4" />
            Duplicar
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : isDuplicado ? 'Duplicar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações e o estoque por tamanho deste conjunto.'
              : isDuplicado
                ? 'Todas as informações foram copiadas, incluindo tamanhos e estoque. Ajuste o que for diferente e cadastre.'
                : 'Cadastre um conjunto uma única vez e defina o estoque de cada tamanho.'}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          {isEdit && <input type="hidden" name="id" value={produto?.id} />}
          <input type="hidden" name="foto_url" value={fotoUrl ?? ''} />
          <input type="hidden" name="tamanhos" value={tamanhosPayload} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pré-visualização do produto" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="foto">Foto do produto</Label>
              <Input
                id="foto"
                type="file"
                accept="image/*"
                disabled={uploading}
                className={inputTouch}
                onChange={handleFotoChange}
              />
              {uploading && <p className="text-xs text-muted-foreground">Enviando foto...</p>}
            </div>
          </div>

          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" data-invalid={Boolean(state.fieldErrors?.nome)}>
              <FieldLabel htmlFor="nome">Nome do produto</FieldLabel>
              <Input
                id="nome"
                name="nome"
                minLength={2}
                aria-invalid={Boolean(state.fieldErrors?.nome)}
                aria-describedby="nome-error"
                defaultValue={base?.nome}
                placeholder="Conjunto Infantil"
                className={inputTouch}
                required
              />
              <FieldError id="nome-error" errors={state.fieldErrors?.nome?.map(message => ({ message }))} />
            </Field>

            <Field data-invalid={Boolean(state.fieldErrors?.time)}>
              <FieldLabel htmlFor="time">Time</FieldLabel>
              <Input id="time" name="time" minLength={2} aria-invalid={Boolean(state.fieldErrors?.time)} aria-describedby="time-error" defaultValue={base?.time} placeholder="Flamengo" className={inputTouch} required />
              <FieldError id="time-error" errors={state.fieldErrors?.time?.map(message => ({ message }))} />
            </Field>

            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                name="categoria"
                defaultValue={base?.categoria ?? 'Conjuntinho'}
                className={selectTouch}
              >
                <option value="Conjuntinho">Conjuntinho</option>
                <option value="Camisa">Camisa</option>
                <option value="Bermuda">Bermuda</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cor">Cor (opcional)</Label>
              <Input id="cor" name="cor" defaultValue={base?.cor ?? ''} placeholder="Vermelho" className={inputTouch} />
            </div>

            <CurrencyField
              id="preco_atacado"
              name="preco_atacado"
              label="Preço no atacado"
              errors={state.fieldErrors?.preco_atacado}
              defaultValue={base?.preco_atacado}
              required
            />

            <CurrencyField
              id="custo"
              name="custo"
              label="Custo de produção"
              errors={state.fieldErrors?.custo}
              defaultValue={base?.custo ?? ''}
            />
          </FieldGroup>

          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Tamanhos e estoque</p>
              <p className="text-xs text-muted-foreground">
                Selecione os tamanhos disponíveis (0, 2, 4, 6, 8, 10, 12 e 14) e informe o estoque de cada um.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tamanhos.map((t) => (
                <button
                  key={t.tamanho}
                  type="button"
                  aria-pressed={t.ativo}
                  onClick={() => toggleTamanho(t.tamanho)}
                  className={cn(
                    'flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors',
                    t.ativo
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-foreground hover:border-primary',
                  )}
                >
                  {t.tamanho}
                </button>
              ))}
            </div>

            {tamanhosAtivos.length === 0 ? (
              <p className="text-xs text-destructive">Selecione ao menos um tamanho.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Tam.</span>
                  <span>Estoque</span>
                  <span>Mínimo</span>
                </div>
                {tamanhosAtivos.map((t) => (
                  <div key={t.tamanho} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
                    <span className="flex h-9 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {t.tamanho}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`Estoque do tamanho ${t.tamanho}`}
                      value={t.estoque_atual}
                      className={inputTouch}
                      onChange={(e) => setEstoque(t.tamanho, Number.parseInt(e.target.value || '0', 10))}
                    />
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`Estoque mínimo do tamanho ${t.tamanho}`}
                      value={t.estoque_minimo}
                      className={inputTouch}
                      onChange={(e) => setEstoqueMinimo(t.tamanho, Number.parseInt(e.target.value || '0', 10))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium">Ativo no catálogo</p>
              <p className="text-xs text-muted-foreground">Produtos inativos não aparecem para os lojistas.</p>
            </div>
            <Switch name="ativo" defaultChecked={base?.ativo ?? true} />
          </div>

          {state.error && <FieldError tabIndex={-1}>{state.error}</FieldError>}

          <DialogFooter>
            <SubmitButton isEdit={isEdit} disabled={uploading || tamanhosAtivos.length === 0} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
