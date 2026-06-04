import axios from 'axios'
import { useAuth } from '@/composables/useAuth'
import { isEmbedMode } from '@/utils/embedMode'

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/** Mirror the in-memory token into an HttpOnly cookie for img/download requests. */
export async function syncSessionCookie(): Promise<void> {
  const { accessToken, loggedOut } = useAuth()
  if (loggedOut.value || !accessToken.value) return
  await axios.post(
    `${baseUrl}/auth/session`,
    { embed: isEmbedMode() },
    { headers: { Authorization: `Bearer ${accessToken.value}` } },
  )
}

export async function clearSessionCookie(): Promise<void> {
  try {
    await axios.post(`${baseUrl}/auth/logout`)
  } catch {
    // Best-effort; cookie may already be absent.
  }
}
