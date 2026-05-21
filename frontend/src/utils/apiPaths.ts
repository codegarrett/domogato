const API_PREFIX = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/** Path relative to axios baseURL (strips duplicate /api/v1 prefix). */
export function normalizeApiPath(path: string): string {
  if (path.startsWith(API_PREFIX)) {
    const relative = path.slice(API_PREFIX.length)
    return relative.startsWith('/') ? relative : `/${relative}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

/** Absolute site path for browser requests (img src, window.open). */
export function normalizeAssetPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith(API_PREFIX)) return path
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`
}
