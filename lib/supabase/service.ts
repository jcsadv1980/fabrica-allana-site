import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client for admin server actions only. This bypasses Row
 * Level Security, so it must NEVER be imported from client components and
 * must only be used behind the admin session check (see lib/admin-auth.ts).
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    const chain = new Proxy(
      {
        then: (resolve: (value: { data: null; error: null }) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      },
      {
        get(target, property) {
          if (property === 'then') return target.then
          return () => chain
        },
      },
    )
    return { from: () => chain } as ReturnType<typeof createSupabaseClient>
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
