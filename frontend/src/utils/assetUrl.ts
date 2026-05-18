import { useAuth } from '@/composables/useAuth'

/** Append access_token for API-served assets (avatars) loaded via img src. */
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const { accessToken } = useAuth()
  if (!accessToken.value) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}access_token=${encodeURIComponent(accessToken.value)}`
}
