<template>
  <Toast />
  <router-view />
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { registerToast } from '@/composables/useToast'

const toast = useToast()
registerToast(toast)

const app = getCurrentInstance()?.appContext.app
if (app) {
  app.config.errorHandler = (err, _instance, info) => {
    console.error(`[Vue Error] ${info}:`, err)
  }
}
</script>
