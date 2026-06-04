const EMBED_MODE_KEY = 'projecthub-embed-mode'

export function isEmbedMode(): boolean {
  return sessionStorage.getItem(EMBED_MODE_KEY) === '1'
}

export function setEmbedMode(): void {
  sessionStorage.setItem(EMBED_MODE_KEY, '1')
}

export function clearEmbedMode(): void {
  sessionStorage.removeItem(EMBED_MODE_KEY)
}

export function isEmbedRoute(path: string): boolean {
  return path.startsWith('/embed') || path.startsWith('/auth/embed')
}

export function embedReturnPath(query: Record<string, string | string[] | undefined>): string {
  const returnTo = query.returnTo
  if (typeof returnTo === 'string' && returnTo.startsWith('/embed')) {
    return returnTo
  }
  return '/embed/agent'
}

export function embedLoginPath(returnTo?: string): string {
  const target = returnTo || '/embed/agent'
  return `/auth/embed/login?returnTo=${encodeURIComponent(target)}`
}

export function redirectToEmbedLogin(returnTo?: string): void {
  window.location.href = embedLoginPath(returnTo || window.location.pathname)
}
