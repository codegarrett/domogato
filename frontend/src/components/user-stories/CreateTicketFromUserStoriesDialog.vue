<template>
  <Dialog
    :visible="visible"
    modal
    :header="$t('userStories.createTicket')"
    :style="{ width: '36rem', maxWidth: '95vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="flex flex-column gap-3">
      <p class="text-sm text-color-secondary m-0">
        {{ $t('userStories.createTicketHint', { count: selectedStories.length }) }}
      </p>
      <ul class="m-0 pl-3 text-sm">
        <li v-for="s in selectedStories" :key="s.id">{{ s.title }}</li>
      </ul>
      <div>
        <label class="block text-sm font-semibold mb-1">{{ $t('tickets.ticketType') }}</label>
        <Select
          v-model="ticketType"
          :options="ticketTypeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
      <div class="flex gap-2 justify-content-end">
        <Button :label="$t('common.cancel')" severity="secondary" text @click="close" />
        <Button
          :label="$t('userStories.createTicket')"
          icon="pi pi-ticket"
          :loading="submitting"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { createTicketsFromUserStories, type UserStoryListItem } from '@/api/user-stories'
import { useToastService } from '@/composables/useToast'

const props = defineProps<{
  visible: boolean
  projectId: string
  selectedStories: UserStoryListItem[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const router = useRouter()
const toast = useToastService()

const ticketType = ref('story')
const submitting = ref(false)

const ticketTypeOptions = [
  { label: t('tickets.story'), value: 'story' },
  { label: t('tickets.task'), value: 'task' },
  { label: t('tickets.bug'), value: 'bug' },
  { label: t('tickets.epic'), value: 'epic' },
]

function close() {
  emit('update:visible', false)
}

async function submit() {
  if (!props.selectedStories.length) return
  submitting.value = true
  try {
    const tickets = await createTicketsFromUserStories(
      props.projectId,
      props.selectedStories.map((s) => s.id),
      ticketType.value,
    )
    toast.showSuccess(t('userStories.ticketCreated'), '')
    emit('created')
    close()
    const ticket = tickets[0]
    if (tickets.length === 1 && ticket?.ticket_key) {
      router.push(`/projects/${props.projectId}/tickets/${ticket.ticket_key}`)
    }
  } catch (err: unknown) {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
    if (detail && typeof detail === 'object' && 'validation_errors' in (detail as object)) {
      toast.showError(t('userStories.refinedFieldsRequired'), '')
    } else {
      toast.showError(t('common.error'), '')
    }
  } finally {
    submitting.value = false
  }
}
</script>
