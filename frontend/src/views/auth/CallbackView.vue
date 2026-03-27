<template>
  <div style="text-align: center;">
    <i v-if="!errorMsg" class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
    <p v-if="!errorMsg" style="margin-top: 1rem;">Completing sign in...</p>
    <div v-else>
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--p-red-500);" />
      <p style="margin-top: 1rem; color: var(--p-red-500);">{{ errorMsg }}</p>
      <Button label="Return to Login" class="mt-3" @click="$router.push('/auth/login')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const errorMsg = ref<string | null>(null)

onMounted(async () => {
  try {
    const returnTo = await authStore.doCallback()
    router.replace(returnTo)
  } catch (e) {
    console.error('OIDC callback error:', e)
    errorMsg.value = 'Authentication failed. Please try again.'
  }
})
</script>
