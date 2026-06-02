<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import type { Ticket } from '@/api/tickets'
import { countUnselectedDescendants } from '@/utils/collectTicketsForDelete'

const props = defineProps<{
  selectedTickets: Ticket[]
  loading?: boolean
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  confirm: [options: { deleteSubtasks: boolean }]
}>()

const confirmText = ref('')
const deleteSubtasks = ref(false)
const descendantCount = ref(0)
const loadingDescendants = ref(false)

const displayCount = () => {
  const base = props.selectedTickets.length
  if (deleteSubtasks.value && descendantCount.value > 0) {
    return base + descendantCount.value
  }
  return base
}

watch(visible, async (open) => {
  if (!open) {
    confirmText.value = ''
    deleteSubtasks.value = false
    descendantCount.value = 0
    return
  }
  loadingDescendants.value = true
  try {
    descendantCount.value = await countUnselectedDescendants(props.selectedTickets)
    deleteSubtasks.value = descendantCount.value > 0
  } finally {
    loadingDescendants.value = false
  }
})

function submit() {
  if (confirmText.value !== 'delete') return
  emit('confirm', { deleteSubtasks: deleteSubtasks.value && descendantCount.value > 0 })
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('tickets.deleteConfirmTitle')"
    modal
    :style="{ width: '28rem', maxWidth: '95vw' }"
    :closable="!loading"
    @hide="confirmText = ''"
  >
    <p class="text-sm text-color-secondary mt-0 mb-3">
      {{ $t('tickets.deleteConfirmMessage', { count: displayCount() }) }}
    </p>
    <p
      v-if="descendantCount > 0 && !loadingDescendants"
      class="text-sm text-color-secondary mt-0 mb-3"
    >
      {{ $t('tickets.deleteSubtasksHint', { count: descendantCount }) }}
    </p>
    <label
      v-if="descendantCount > 0 && !loadingDescendants"
      class="flex align-items-center gap-2 text-sm mb-3 cursor-pointer"
    >
      <Checkbox v-model="deleteSubtasks" binary :disabled="loading" />
      <span>{{ $t('tickets.deleteSubtasksLabel', { count: descendantCount }) }}</span>
    </label>
    <label class="block text-sm font-semibold mb-2">{{ $t('tickets.deleteConfirmType') }}</label>
    <InputText
      v-model="confirmText"
      class="w-full"
      :placeholder="$t('tickets.deleteConfirmPlaceholder')"
      autocomplete="off"
      :disabled="loading"
      @keyup.enter="submit"
    />
    <template #footer>
      <Button
        :label="$t('common.cancel')"
        severity="secondary"
        text
        :disabled="loading"
        @click="visible = false"
      />
      <Button
        :label="$t('tickets.deleteSelected', { n: displayCount() })"
        icon="pi pi-trash"
        severity="danger"
        :loading="loading"
        :disabled="confirmText !== 'delete' || displayCount() === 0"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
