import { normalizeAssetPath } from '@/utils/apiPaths'

/** Absolute API path for authenticated assets loaded via img src (uses HttpOnly session cookie). */
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return normalizeAssetPath(url)
}
