import apiClient from '@/api/client'
import { useAuth } from '@/composables/useAuth'

function filenameFromDisposition(disposition: string | undefined): string | null {
  if (!disposition) return null
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
  const name = match?.[1]
  return name ? decodeURIComponent(name.replace(/"/g, '')) : null
}

/** Download a file from an API-proxied download endpoint. */
export async function downloadFromApi(path: string, fallbackFilename = 'download'): Promise<void> {
  const { accessToken } = useAuth()
  const separator = path.includes('?') ? '&' : '?'
  const url =
    accessToken.value != null
      ? `${path}${separator}access_token=${encodeURIComponent(accessToken.value)}`
      : path

  const response = await apiClient.get(url, { responseType: 'blob' })
  const blob = response.data as Blob
  const name = filenameFromDisposition(response.headers['content-disposition']) ?? fallbackFilename

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  link.click()
  URL.revokeObjectURL(objectUrl)
}
