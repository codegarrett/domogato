/// <reference types="vite/client" />

declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'
  export function gfm(service: TurndownService): void
  export function tables(service: TurndownService): void
  export function strikethrough(service: TurndownService): void
  export function taskListItems(service: TurndownService): void
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_OIDC_AUTHORITY: string
  readonly VITE_OIDC_CLIENT_ID: string
  readonly VITE_OIDC_REDIRECT_URI: string
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
