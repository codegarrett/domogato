<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ProgressBar from 'primevue/progressbar'
import { useToastService } from '@/composables/useToast'
import {
  listSprints,
  createSprint,
  startSprint,
  completeSprint,
  deleteSprint,
  getSprintDetail,
  type Sprint,
  type SprintStats,
  type SprintCreate,
} from '@/api/sprints'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const sprints = ref<Sprint[]>([])
const sprintStats = ref<Map<string, SprintStats>>(new Map())
const loading = ref(false)
const showCreateDialog = ref(false)
const saving = ref(false)

const newSprint = ref<SprintCreate>({ name: '' })

const showCompleteDialog = ref(false)
const completingSprintId = ref<string | null>(null)
const moveIncompleteTo = ref('backlog')

const activeSprint = computed(() => sprints.value.find((s) => s.status === 'active'))
const planningSprints = computed(() => sprints.value.filter((s) => s.status === 'planning'))
const completedSprints = computed(() => sprints.value.filter((s) => s.status === 'completed'))

async function loadSprints() {
  loading.value = true
  try {
    const resp = await listSprints(projectId, { limit: 100 })
    sprints.value = resp.items
    for (const s of resp.items) {
      const stats = await getSprintDetail(s.id)
      sprintStats.value.set(s.id, stats)
    }
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  newSprint.value = { name: '' }
  showCreateDialog.value = true
}

async function onCreate() {
  if (!newSprint.value.name.trim()) return
  saving.value = true
  try {
    await createSprint(projectId, newSprint.value)
    showCreateDialog.value = false
    toast.showSuccess(t('common.success'), t('sprints.created'))
    await loadSprints()
  } finally {
    saving.value = false
  }
}

async function onStart(sprintId: string) {
  try {
    await startSprint(sprintId)
    toast.showSuccess(t('common.success'), t('sprints.started'))
    await loadSprints()
  } catch {
    // global interceptor
  }
}

function openCompleteDialog(sprintId: string) {
  completingSprintId.value = sprintId
  moveIncompleteTo.value = 'backlog'
  showCompleteDialog.value = true
}

async function onComplete() {
  if (!completingSprintId.value) return
  saving.value = true
  try {
    await completeSprint(completingSprintId.value, moveIncompleteTo.value)
    showCompleteDialog.value = false
    toast.showSuccess(t('common.success'), t('sprints.completed'))
    await loadSprints()
  } finally {
    saving.value = false
  }
}

async function onDelete(sprintId: string) {
  try {
    await deleteSprint(sprintId)
    toast.showSuccess(t('common.success'), t('sprints.deleted'))
    await loadSprints()
  } catch {
    // global interceptor
  }
}

function progressPercent(sid: string): number {
  const stats = sprintStats.value.get(sid)
  if (!stats || stats.total_tickets === 0) return 0
  return Math.round((stats.completed_tickets / stats.total_tickets) * 100)
}

function goToBacklog() {
  router.push(`/projects/${projectId}/backlog`)
}

onMounted(loadSprints)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('sprints.title') }}</h2>
      <div class="flex gap-2">
        <Button :label="$t('sprints.backlog')" icon="pi pi-inbox" severity="secondary" @click="goToBacklog" />
        <Button :label="$t('sprints.create')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-4xl text-color-secondary" />
    </div>

    <div v-else class="flex flex-column gap-4">
      <!-- Active sprint -->
      <div v-if="activeSprint" class="surface-card p-4 border-round shadow-1 border-left-3 border-green-500">
        <div class="flex align-items-center justify-content-between mb-2">
          <div class="flex align-items-center gap-2">
            <h3 class="m-0">{{ activeSprint.name }}</h3>
            <Tag value="Active" severity="success" />
          </div>
          <Button :label="$t('sprints.completeSprint')" icon="pi pi-check-circle" severity="success" size="small" @click="openCompleteDialog(activeSprint.id)" />
        </div>
        <p v-if="activeSprint.goal" class="text-color-secondary text-sm mt-1 mb-2">{{ activeSprint.goal }}</p>
        <div v-if="activeSprint.start_date || activeSprint.end_date" class="text-xs text-color-secondary mb-2">
          {{ activeSprint.start_date }} — {{ activeSprint.end_date || '...' }}
        </div>
        <ProgressBar :value="progressPercent(activeSprint.id)" :showValue="true" class="mb-2" />
        <div class="flex gap-4 text-sm text-color-secondary">
          <span>{{ $t('sprints.tickets') }}: {{ sprintStats.get(activeSprint.id)?.completed_tickets ?? 0 }}/{{ sprintStats.get(activeSprint.id)?.total_tickets ?? 0 }}</span>
          <span>{{ $t('sprints.storyPoints') }}: {{ sprintStats.get(activeSprint.id)?.completed_story_points ?? 0 }}/{{ sprintStats.get(activeSprint.id)?.total_story_points ?? 0 }}</span>
        </div>
      </div>

      <!-- Planning sprints -->
      <div v-if="planningSprints.length > 0">
        <h3 class="text-sm font-semibold text-color-secondary uppercase mb-2">{{ $t('sprints.planning') }}</h3>
        <div class="flex flex-column gap-2">
          <div v-for="s in planningSprints" :key="s.id" class="surface-card p-3 border-round shadow-1 flex align-items-center justify-content-between">
            <div>
              <div class="flex align-items-center gap-2">
                <span class="font-semibold">{{ s.name }}</span>
                <Tag value="Planning" severity="info" />
              </div>
              <p v-if="s.goal" class="text-color-secondary text-xs m-0 mt-1">{{ s.goal }}</p>
            </div>
            <div class="flex gap-2">
              <Button icon="pi pi-play" severity="success" size="small" text rounded :disabled="!!activeSprint" v-tooltip="$t('sprints.startSprint')" @click="onStart(s.id)" />
              <Button icon="pi pi-trash" severity="danger" size="small" text rounded @click="onDelete(s.id)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Completed sprints -->
      <div v-if="completedSprints.length > 0">
        <h3 class="text-sm font-semibold text-color-secondary uppercase mb-2">{{ $t('sprints.completedSprints') }}</h3>
        <div class="flex flex-column gap-2">
          <div v-for="s in completedSprints" :key="s.id" class="surface-card p-3 border-round shadow-1">
            <div class="flex align-items-center justify-content-between">
              <div class="flex align-items-center gap-2">
                <span class="font-semibold">{{ s.name }}</span>
                <Tag value="Completed" severity="secondary" />
                <Tag v-if="s.velocity !== null" :value="`${s.velocity} pts`" severity="info" class="text-xs" />
              </div>
              <span v-if="s.completed_at" class="text-xs text-color-secondary">{{ new Date(s.completed_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="sprints.length === 0" class="text-center text-color-secondary p-6">
        {{ $t('sprints.empty') }}
      </div>
    </div>

    <!-- Create dialog -->
    <Dialog v-model:visible="showCreateDialog" :header="$t('sprints.create')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('sprints.sprintName') }}</label>
          <InputText v-model="newSprint.name" class="w-full" :placeholder="$t('sprints.namePlaceholder')" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('sprints.goal') }}</label>
          <Textarea v-model="newSprint.goal" class="w-full" rows="2" />
        </div>
        <div class="grid">
          <div class="col-6">
            <label class="block text-sm font-semibold mb-1">{{ $t('tickets.startDate') }}</label>
            <input type="date" class="p-inputtext p-component w-full border-round" v-model="newSprint.start_date" />
          </div>
          <div class="col-6">
            <label class="block text-sm font-semibold mb-1">{{ $t('sprints.endDate') }}</label>
            <input type="date" class="p-inputtext p-component w-full border-round" v-model="newSprint.end_date" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="saving" @click="onCreate" />
      </template>
    </Dialog>

    <!-- Complete sprint dialog -->
    <Dialog v-model:visible="showCompleteDialog" :header="$t('sprints.completeSprint')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <p class="text-sm text-color-secondary m-0">{{ $t('sprints.completeDescription') }}</p>
        <div class="flex flex-column gap-2">
          <div class="flex align-items-center gap-2">
            <input type="radio" id="move-backlog" value="backlog" v-model="moveIncompleteTo" />
            <label for="move-backlog" class="text-sm">{{ $t('sprints.moveToBacklog') }}</label>
          </div>
          <div v-for="s in planningSprints" :key="s.id" class="flex align-items-center gap-2">
            <input type="radio" :id="`move-${s.id}`" :value="s.id" v-model="moveIncompleteTo" />
            <label :for="`move-${s.id}`" class="text-sm">{{ $t('sprints.moveToSprint', { name: s.name }) }}</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCompleteDialog = false" />
        <Button :label="$t('sprints.completeSprint')" icon="pi pi-check-circle" severity="success" :loading="saving" @click="onComplete" />
      </template>
    </Dialog>
  </div>
</template>
