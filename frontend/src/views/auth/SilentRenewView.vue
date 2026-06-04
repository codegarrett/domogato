<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  try {
    const envAuthority = import.meta.env.VITE_OIDC_AUTHORITY
    const envClientId = import.meta.env.VITE_OIDC_CLIENT_ID
    if (!envAuthority || !envClientId) return

    const { UserManager, WebStorageStateStore } = await import('oidc-client-ts')
    const mgr = new UserManager({
      authority: envAuthority,
      client_id: envClientId,
      redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`,
      silent_redirect_uri: `${window.location.origin}/auth/silent-renew`,
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    })
    await mgr.signinSilentCallback()
  } catch (e) {
    console.error('Silent renew callback failed:', e)
  }
})
</script>
