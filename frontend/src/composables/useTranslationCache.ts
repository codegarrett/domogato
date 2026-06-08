const STORAGE_KEY = 'projecthub-content-translations-v1'
const MAX_ENTRIES = 100

interface CacheEntry {
  translated: string
  updatedAt: number
}

interface CacheStore {
  entries: Record<string, CacheEntry>
}

function loadStore(): CacheStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { entries: {} }
    const parsed = JSON.parse(raw) as CacheStore
    if (!parsed.entries || typeof parsed.entries !== 'object') return { entries: {} }
    return parsed
  } catch {
    return { entries: {} }
  }
}

function saveStore(store: CacheStore): void {
  const keys = Object.keys(store.entries)
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort(
      (a, b) => (store.entries[a]?.updatedAt ?? 0) - (store.entries[b]?.updatedAt ?? 0),
    )
    const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES)
    for (const key of toRemove) {
      delete store.entries[key]
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function buildTranslationCacheKey(locale: string, textHash: string): string {
  return `${locale}:${textHash}`
}

export function getCachedTranslation(cacheKey: string): string | null {
  const store = loadStore()
  return store.entries[cacheKey]?.translated ?? null
}

export function setCachedTranslation(cacheKey: string, translated: string): void {
  const store = loadStore()
  store.entries[cacheKey] = { translated, updatedAt: Date.now() }
  saveStore(store)
}
