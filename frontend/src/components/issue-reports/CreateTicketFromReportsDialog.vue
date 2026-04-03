<template>
  <Dialog
    :visible="visible"
    :header="$t('issueReports.createTicketFromSelected')"
    modal
    :style="{ width: '36rem', maxWidth: '95vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="flex flex-column gap-3">
      <div class="surface-ground p-3 border-round">
        <p class="text-sm font-semibold mb-2">
          {{ $t('issueReports.selectedCount', { count: selectedReports.length }) }}
        </p>
        <ul class="list-none p-0 m-0">
          <li
            v-for="report in selectedReports"
            :key="report.id"
            class="flex align-items-center gap-2 mb-1 text-sm"
          >
            <i class="pi pi-file text-color-secondary" />
            <span>{{ report.title }}</span>
            <Tag :severity="report.priority === 'critical' ? 'danger' : 'info'" :value="report.priority" class="text-xs" />
          </li>
        </ul>
      </div>

      <div>
        <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.reportTitle') }}</label>
        <InputText
          v-model="form.title"
          class="w-full"
          :placeholder="defaultTitle"
        />
        <small class="text-color-secondary">{{ !form.title ? 'Will use: ' + defaultTitle : '' }}</small>
      </div>

      <div>
        <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.reportDescription') }}</label>
        <Textarea
          v-model="form.description"
          class="w-full"
          :rows="4"
          placeholder="Optional override (auto-generated from reports if empty)"
        />
      </div>

      <div class="flex gap-3">
        <div class="flex-1">
          <label class="block text-sm font-semibold mb-1">Type</label>
          <Select
            v-model="form.ticket_type"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="flex-1">
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.priority') }}</label>
          <Select
            v-model="form.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="$emit('update:visible', false)" />
      <Button
        :label="$t('issueReports.createTicket')"
        icon="pi pi-ticket"
        :loading="submitting"
        :disabled="selectedReports.length === 0"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { createTicketFromReports, type IssueReport } from '@/api/issue-reports'
import { useToastService } from '@/composables/useToast'

const props = defineProps<{
  visible: boolean
  projectId: string
  selectedReports: IssueReport[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const router = useRouter()
const toast = useToastService()
const submitting = ref(false)

const form = ref({
  title: '',
  description: '',
  ticket_type: 'bug',
  priority: 'medium',
})

const defaultTitle = computed(() =>
  props.selectedReports.length > 0 ? props.selectedReports[0]?.title ?? '' : '',
)

const typeOptions = [
  { label: 'Bug', value: 'bug' },
  { label: 'Task', value: 'task' },
  { label: 'Story', value: 'story' },
]

const priorityOptions = [
  { label: 'Lowest', value: 'lowest' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Highest', value: 'highest' },
]

async function submit() {
  submitting.value = true
  try {
    const result = await createTicketFromReports(props.projectId, {
      issue_report_ids: props.selectedReports.map((r) => r.id),
      title: form.value.title || undefined,
      description: form.value.description || undefined,
      ticket_type: form.value.ticket_type,
      priority: form.value.priority,
    })
    toast.showSuccess(t('issueReports.ticketCreated'), '')
    emit('created')

    if (result?.ticket?.id) {
      router.push(`/tickets/${result.ticket.id}`)
    }
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    submitting.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    form.value = { title: '', description: '', ticket_type: 'bug', priority: 'medium' }
  }
})
</script>
