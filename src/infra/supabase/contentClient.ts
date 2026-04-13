/**
 * Content-Projekt (gleiche DB/Storage wie StreetSmarts „content“).
 * Bucket `media`: Pfade wie `{topic}/{theme}/{chapter}/{contentId}/…`
 *
 * Primär: VITE_CONTENT_SUPABASE_* — falls nicht gesetzt, Fallback auf VITE_SUPABASE_*
 * (eine Supabase-Instanz für App + Content, wie in .env.local oft nur die SUPABASE_-Keys stehen).
 */
import { createClient } from '@supabase/supabase-js'

/** Aufgelöste URL/Key für Content-DB und Storage-Upload (einheitlich mit Upload-Check). */
export function resolveContentSupabaseEnv(): { url: string; key: string } {
  const url = String(
    import.meta.env.VITE_CONTENT_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? ''
  ).trim()
  const key = String(
    import.meta.env.VITE_CONTENT_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  ).trim()
  return { url, key }
}

const { url: contentUrl, key: contentKey } = resolveContentSupabaseEnv()

if (!contentUrl || !contentKey) {
  console.warn(
    '⚠️ Content-Supabase: weder VITE_CONTENT_SUPABASE_URL / VITE_CONTENT_SUPABASE_ANON_KEY noch VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY gesetzt – DB/Storage aus dem Editor eingeschränkt.'
  )
}

export const contentSupabase = createClient(
  contentUrl || 'https://placeholder.supabase.co',
  contentKey || 'placeholder-key'
)
