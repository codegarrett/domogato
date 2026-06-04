<template>
  <div style="text-align: center;">
    <i v-if="!errorMsg" class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
    <p v-if="!errorMsg" style="margin-top: 1rem;">Completing sign in...</p>
    <div v-else>
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--p-red-500);" />
      <p style="margin-top: 1rem; color: var(--p-red-500);">{{ errorMsg }}</p>
      <Button :label="$t('auth.returnToLogin')" class="mt-3" @click="goToLogin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { isEmbedMode, embedLoginPath, setEmbedMode } from '@/utils/embedMode'

const router = useRouter()
const authStore = useAuthStore()
const errorMsg = ref<string | null>(null)

function goToLogin() {
  if (isEmbedMode()) {
    router.push(embedLoginPath('/embed/agent'))
  } else {
    router.push('/auth/login')
  }
}

onMounted(async () => {
  if (isEmbedMode()) {
    setEmbedMode()
  }
  try {
    const returnTo = await authStore.doCallback()
    if (returnTo.startsWith('/embed')) {
      setEmbedMode()
    }
    router.replace(returnTo)
  } catch (e) {
    console.error('OIDC callback error:', e)
    errorMsg.value = 'Authentication failed. Please try again.'
  }
})
</script>
