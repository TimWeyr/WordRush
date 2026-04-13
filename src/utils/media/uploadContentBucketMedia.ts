/**
 * Upload in den Bucket `media` mit gleichem Pfad wie StreetSmarts / Editor-URL:
 * `{universeId}/{themeId}/{chapterId}/{contentId}/{dateiname}`
 *
 * Editor-Beispiel: /editor/psychiatrie/f50_f59/schlafstoerungen/F51_053
 * → psychiatrie / f50_f59 / schlafstoerungen / F51_053 / datei.png
 */
import { StorageApiError, StorageUnknownError } from '@supabase/storage-js'
import { contentSupabase, resolveContentSupabaseEnv } from '@/infra/supabase/contentClient'

/** Muss exakt `storage.buckets.name` entsprechen (case-sensitiv). Optional: `VITE_CONTENT_STORAGE_BUCKET` in .env.local. */
const BUCKET =
  String(import.meta.env.VITE_CONTENT_STORAGE_BUCKET ?? 'media').trim() || 'media'

function logStorageUploadFailure(
  err: unknown,
  ctx: { storagePath: string; fileName: string; fileSize: number }
): void {
  const base = { bucket: BUCKET, ...ctx }
  if (err instanceof StorageApiError) {
    console.error('[uploadContentBucketMedia]', base, err.toJSON())
    return
  }
  if (err instanceof StorageUnknownError) {
    console.error('[uploadContentBucketMedia]', base, {
      message: err.message,
      originalError: err.originalError,
    })
    return
  }
  console.error('[uploadContentBucketMedia]', base, err)
}

/** Lesbare Meldung für Toast + gleicher Text in console.error (wenn throw). */
function formatStorageUploadError(err: unknown): string {
  if (err instanceof StorageApiError) {
    const msg = (err.message || '').trim()
    const detail =
      msg && msg !== '{}'
        ? msg
        : 'API hat keinen Text gesendet (Body leer oder kein message-Feld)'
    return `${detail} · HTTP ${err.status}${err.statusCode ? ` · ${err.statusCode}` : ''}`
  }
  if (err instanceof StorageUnknownError) {
    const extra =
      err.originalError != null ? ` · ${String(err.originalError)}` : ''
    return `${err.message || 'Storage-Fehler (unbekannt)'}${extra}`
  }
  if (err instanceof Error) return err.message
  return String(err)
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file'
}

export function buildMediaStoragePath(params: {
  universeId: string
  themeId: string
  chapterId: string
  contentId: string
  fileName: string
}): string {
  const safe = sanitizeFileName(params.fileName)
  return `${params.universeId}/${params.themeId}/${params.chapterId}/${params.contentId}/${safe}`
}

export async function uploadMediaFileToBucket(
  file: File,
  params: {
    universeId: string
    themeId: string
    chapterId: string
    contentId: string
  }
): Promise<{ publicUrl: string; storagePath: string }> {
  const { url, key } = resolveContentSupabaseEnv()
  if (!url || !key) {
    throw new Error(
      'Content-Supabase nicht konfiguriert: VITE_CONTENT_SUPABASE_URL + VITE_CONTENT_SUPABASE_ANON_KEY oder VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local'
    )
  }

  const storagePath = buildMediaStoragePath({ ...params, fileName: file.name })

  const { error } = await contentSupabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  })

  if (error) {
    logStorageUploadFailure(error, {
      storagePath,
      fileName: file.name,
      fileSize: file.size,
    })
    throw new Error(formatStorageUploadError(error))

  }

  const { data } = contentSupabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = data.publicUrl
  return { publicUrl, storagePath }
}
