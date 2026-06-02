<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProgressSpinner from 'primevue/progressspinner'
import { getTicket } from '@/api/tickets'
import { ticketDetailPath } from '@/utils/ticketUrls'

const route = useRoute()
const router = useRouter()
const error = ref<string | null>(null)

onMounted(async () => {
  const ticketId = route.params.ticketId as string
  if (!ticketId) {
    error.value = 'Missing ticket id'
    return
  }
  try {
    const ticket = await getTicket(ticketId)
    await router.replace(ticketDetailPath(ticket.project_id, ticket))
  } catch {
    error.value = 'Ticket not found'
  }
})
</script>

<template>
  <div class="flex flex-column align-items-center justify-content-center p-6 gap-3">
    <ProgressSpinner v-if="!error" />
    <p v-else class="text-color-secondary">{{ error }}</p>
  </div>
</template>
