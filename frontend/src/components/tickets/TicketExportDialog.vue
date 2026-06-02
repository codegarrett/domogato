<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import type { Ticket } from '@/api/tickets'

export interface ExportStatusOption {
  /** Stable key for UI (normalized status name). */
  key: string
  name: string
  /** All workflow_status_ids that share this display name. */
  ids: string[]
}

const props = defineProps<{
  selectedTickets: Ticket[]
  statusOptions: ExportStatusOption[]
  loading?: boolean
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  confirm: [payload: { ticketIds?: string[]; workflowStatusIds?: string[] }]
}>()

const selectedStatusIds = ref<string[]>([])

const exportSelected = computed(() => props.selectedTickets.length > 0)

function isOptionSelected(option: ExportStatusOption): boolean {
  return option.ids.every((id) => selectedStatusIds.value.includes(id))
}

const allStatusesSelected = computed({
  get: () =>
    props.statusOptions.length > 0 &&
    props.statusOptions.every((opt) => isOptionSelected(opt)),
  set: (checked: boolean) => {
    selectedStatusIds.value = checked
      ? props.statusOptions.flatMap((s) => s.ids)
      : []
  },
})

const canSubmit = computed(() => {
  if (exportSelected.value) return true
  return selectedStatusIds.value.length > 0
})

watch(visible, (open) => {
  if (!open) {
    selectedStatusIds.value = []
    return
  }
  if (!exportSelected.value) {
    selectedStatusIds.value = props.statusOptions.flatMap((s) => s.ids)
  }
})

function toggleStatus(option: ExportStatusOption, checked: boolean) {
  if (checked) {
    const next = new Set(selectedStatusIds.value)
    for (const id of option.ids) next.add(id)
    selectedStatusIds.value = [...next]
  } else {
    const remove = new Set(option.ids)
    selectedStatusIds.value = selectedStatusIds.value.filter((id) => !remove.has(id))
  }
}

function submit() {
  if (!canSubmit.value) return
  if (exportSelected.value) {
    emit('confirm', { ticketIds: props.selectedTickets.map((t) => t.id) })
  } else {
    emit('confirm', { workflowStatusIds: [...selectedStatusIds.value] })
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('tickets.exportTitle')"
    modal
    :style="{ width: '32rem', maxWidth: '95vw' }"
    :closable="!loading"
  >
    <p v-if="exportSelected" class="text-sm text-color-secondary mt-0 mb-3">
      {{ $t('tickets.exportSelectedMessage', { count: selectedTickets.length }) }}
    </p>
    <template v-else>
      <p class="text-sm text-color-secondary mt-0 mb-3">
        {{ $t('tickets.exportAllMessage') }}
      </p>
      <p class="text-sm font-semibold mb-2">{{ $t('tickets.exportStatusFilter') }}</p>
      <label
        v-if="statusOptions.length > 0"
        class="flex align-items-center gap-2 text-sm mb-2 cursor-pointer"
      >
        <Checkbox v-model="allStatusesSelected" binary :disabled="loading" />
        <span>{{ $t('tickets.exportSelectAllStatuses') }}</span>
      </label>
      <div
        v-if="statusOptions.length > 0"
        class="flex flex-column gap-2 mb-2"
        style="max-height: 14rem; overflow-y: auto"
      >
        <label
          v-for="status in statusOptions"
          :key="status.key"
          class="flex align-items-center gap-2 text-sm cursor-pointer"
        >
          <Checkbox
            :model-value="isOptionSelected(status)"
            binary
            :disabled="loading"
            @update:model-value="(v: boolean) => toggleStatus(status, v)"
          />
          <span>{{ status.name }}</span>
        </label>
      </div>
      <p v-else class="text-sm text-color-secondary">
        {{ $t('tickets.exportNoStatuses') }}
      </p>
    </template>

    <template #footer>
      <Button
        :label="$t('common.cancel')"
        severity="secondary"
        outlined
        :disabled="loading"
        @click="visible = false"
      />
      <Button
        :label="$t('tickets.exportCsv')"
        icon="pi pi-download"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
