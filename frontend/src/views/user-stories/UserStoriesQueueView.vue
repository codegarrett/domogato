<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h1 class="text-2xl font-bold m-0">{{ $t('userStories.queue') }}</h1>
      <Button
        v-if="canCreateUserStory"
        :label="$t('userStories.newStory')"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <div class="surface-card p-4 border-round shadow-1">
      <div class="flex gap-3 mb-3 flex-wrap align-items-end">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('userStories.status') }}</label>
          <Select
            v-model="filters.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('common.status')"
            show-clear
            class="w-12rem"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('userStories.priority') }}</label>
          <Select
            v-model="filters.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('userStories.priority')"
            show-clear
            class="w-10rem"
          />
        </div>
        <div class="flex-1" style="min-width: 200px">
          <label class="block text-sm font-semibold mb-1">{{ $t('common.search') }}</label>
          <InputText
            v-model="filters.q"
            :placeholder="$t('common.search')"
            class="w-full"
            @keyup.enter="loadStories"
          />
        </div>
        <Button
          :label="$t('common.search')"
          icon="pi pi-search"
          severity="secondary"
          @click="loadStories"
        />
      </div>

      <div v-if="selectedStories.length > 0" class="flex align-items-center gap-2 mb-3">
        <Tag severity="info">{{ $t('userStories.selectedCount', { count: selectedStories.length }) }}</Tag>
        <Button
          v-if="canCreateTicketFromStory"
          data-testid="create-ticket-from-stories"
          :label="$t('userStories.createTicketFromSelected')"
          icon="pi pi-ticket"
          size="small"
          @click="showCreateTicketDialog = true"
        />
      </div>

      <DataTable
        v-model:selection="selectedStories"
        :value="stories"
        :loading="loading"
        :rows="pageSize"
        :total-records="totalRecords"
        :lazy="true"
        paginator
        data-key="id"
        striped-rows
        @page="onPage"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="title" :header="$t('userStories.workingTitle')">
          <template #body="{ data: row }">
            <router-link
              :to="`/projects/${projectId}/user-stories/${row.id}`"
              class="font-semibold text-primary no-underline hover:underline"
            >
              {{ row.title }}
            </router-link>
          </template>
        </Column>
        <Column field="status" :header="$t('userStories.status')" style="width: 9rem">
          <template #body="{ data: row }">
            <Tag :severity="statusSeverity(row.status)" :value="statusLabel(row.status)" />
          </template>
        </Column>
        <Column field="priority" :header="$t('userStories.priority')" style="width: 7rem">
          <template #body="{ data: row }">
            <Tag :severity="prioritySeverity(row.priority)" :value="priorityLabel(row.priority)" />
          </template>
        </Column>
        <Column field="question_count" :header="$t('userStories.questions')" style="width: 6rem">
          <template #body="{ data: row }">
            <span v-if="row.question_count" class="flex align-items-center gap-1">
              <i class="pi pi-question-circle text-xs" />
              {{ row.question_count }}
            </span>
            <span v-else class="text-color-secondary">—</span>
          </template>
        </Column>
        <Column field="created_at" :header="$t('userStories.created')" style="width: 10rem">
          <template #body="{ data: row }">
            {{ formatDate(row.created_at) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <CreateUserStoryDialog
      v-model:visible="showCreateDialog"
      :project-id="projectId"
      @created="onStoryCreated"
    />

    <CreateTicketFromUserStoriesDialog
      v-model:visible="showCreateTicketDialog"
      :project-id="projectId"
      :selected-stories="selectedStories"
      @created="onTicketCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { listUserStories, type UserStoryListItem } from '@/api/user-stories'
import { useProjectPermissions } from '@/composables/usePermissions'
import { useToastService } from '@/composables/useToast'
import CreateUserStoryDialog from '@/components/user-stories/CreateUserStoryDialog.vue'
import CreateTicketFromUserStoriesDialog from '@/components/user-stories/CreateTicketFromUserStoriesDialog.vue'

const { t } = useI18n()
const route = useRoute()
const toast = useToastService()

const projectId = computed(() => route.params.projectId as string)

const { canCreateUserStory, canCreateTicketFromStory } = useProjectPermissions(projectId)

const stories = ref<UserStoryListItem[]>([])
const selectedStories = ref<UserStoryListItem[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const pageSize = ref(50)
const currentPage = ref(0)

const showCreateDialog = ref(false)
const showCreateTicketDialog = ref(false)

const filters = ref({
  status: null as string | null,
  priority: null as string | null,
  q: '',
})

const statusOptions = computed(() => [
  { label: t('userStories.notStarted'), value: 'not_started' },
  { label: t('userStories.inProgress'), value: 'in_progress' },
  { label: t('userStories.discovery'), value: 'discovery' },
  { label: t('userStories.storyReady'), value: 'story_ready' },
  { label: t('userStories.ticketCreatedStatus'), value: 'ticket_created' },
  { label: t('userStories.blocked'), value: 'blocked' },
  { label: t('userStories.deferred'), value: 'deferred' },
  { label: t('userStories.canceled'), value: 'canceled' },
])

const priorityOptions = computed(() => [
  { label: t('userStories.lowest'), value: 'lowest' },
  { label: t('userStories.low'), value: 'low' },
  { label: t('userStories.medium'), value: 'medium' },
  { label: t('userStories.high'), value: 'high' },
  { label: t('userStories.highest'), value: 'highest' },
])

function statusSeverity(s: string): string {
  const map: Record<string, string> = {
    not_started: 'secondary',
    in_progress: 'info',
    discovery: 'warn',
    story_ready: 'success',
    ticket_created: 'success',
    blocked: 'danger',
    deferred: 'secondary',
    canceled: 'secondary',
  }
  return map[s] ?? 'info'
}

function statusLabel(s: string): string {
  const key = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const translated = t(`userStories.${key}`)
  return translated !== `userStories.${key}` ? translated : s
}

function prioritySeverity(p: string): string {
  const map: Record<string, string> = {
    lowest: 'secondary',
    low: 'secondary',
    medium: 'info',
    high: 'warn',
    highest: 'danger',
  }
  return map[p] ?? 'info'
}

function priorityLabel(p: string): string {
  const translated = t(`userStories.${p}`)
  return translated !== `userStories.${p}` ? translated : p
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadStories() {
  loading.value = true
  try {
    const result = await listUserStories(projectId.value, {
      status: filters.value.status ?? undefined,
      priority: filters.value.priority ?? undefined,
      q: filters.value.q || undefined,
      offset: currentPage.value * pageSize.value,
      limit: pageSize.value,
    })
    stories.value = result.items
    totalRecords.value = result.total
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    loading.value = false
  }
}

function onPage(event: { first: number; rows: number }) {
  currentPage.value = Math.floor(event.first / event.rows)
  pageSize.value = event.rows
  loadStories()
}

function onStoryCreated() {
  showCreateDialog.value = false
  loadStories()
}

function onTicketCreated() {
  showCreateTicketDialog.value = false
  selectedStories.value = []
  loadStories()
}

watch(() => [filters.value.status, filters.value.priority], () => {
  currentPage.value = 0
  loadStories()
})

onMounted(() => loadStories())
</script>
