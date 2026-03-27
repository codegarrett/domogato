<template>
  <div v-if="project">
    <div class="flex align-items-center gap-2 mb-4">
      <Tag :value="project.key" severity="info" class="text-lg" />
      <h2 class="m-0">{{ project.name }}</h2>
      <Tag v-if="project.is_archived" :value="$t('common.archived')" severity="warning" />
    </div>
    <p v-if="project.description" class="text-color-secondary mb-4">{{ project.description }}</p>

    <div class="grid mb-4">
      <div class="col-12 md:col-6 lg:col-3">
        <div class="surface-card p-4 border-round shadow-1">
          <div class="text-color-secondary mb-2">{{ $t('common.visibility') }}</div>
          <Tag :value="project.visibility" />
        </div>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <div class="surface-card p-4 border-round shadow-1">
          <div class="text-color-secondary mb-2">{{ $t('projects.tickets') }}</div>
          <div class="text-2xl font-bold">{{ project.ticket_sequence }}</div>
        </div>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <div class="surface-card p-4 border-round shadow-1">
          <div class="text-color-secondary mb-2">{{ $t('projects.defaultWorkflow') }}</div>
          <Select
            v-model="selectedWorkflowId"
            :options="workflowOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('projects.selectWorkflow')"
            class="w-full"
            :loading="loadingWorkflows"
            @change="onWorkflowChange"
          />
        </div>
      </div>
    </div>

    <h3 class="mt-3">{{ $t('orgs.members') }}</h3>
    <DataTable :value="members" :loading="loadingMembers" stripedRows class="p-datatable-sm">
      <Column field="display_name" :header="$t('common.name')" />
      <Column field="email" :header="$t('common.email')" />
      <Column field="role" :header="$t('common.role')">
        <template #body="{ data }">
          <Tag :value="data.role" />
        </template>
      </Column>
    </DataTable>
  </div>
  <div v-else class="flex justify-content-center p-5">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { getProject, updateProject, listProjectMembers, type Project, type ProjectMember } from '@/api/projects'
import { listWorkflows, type Workflow } from '@/api/workflows'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const route = useRoute()
const projectId = route.params.projectId as string

const project = ref<Project | null>(null)
const members = ref<ProjectMember[]>([])
const loadingMembers = ref(false)

const workflows = ref<Workflow[]>([])
const loadingWorkflows = ref(false)
const selectedWorkflowId = ref<string | null>(null)

const workflowOptions = computed(() =>
  workflows.value.filter(w => w.is_active).map(w => ({ label: w.name, value: w.id }))
)

async function onWorkflowChange() {
  if (!selectedWorkflowId.value || !project.value) return
  try {
    project.value = await updateProject(projectId, { default_workflow_id: selectedWorkflowId.value })
    toast.showSuccess(t('common.save'), t('projects.workflowUpdated'))
  } catch {
    selectedWorkflowId.value = project.value.default_workflow_id
  }
}

onMounted(async () => {
  project.value = await getProject(projectId)
  selectedWorkflowId.value = project.value.default_workflow_id

  loadingMembers.value = true
  loadingWorkflows.value = true

  const [memberResult, wfResult] = await Promise.all([
    listProjectMembers(projectId),
    listWorkflows(project.value.organization_id),
  ])

  members.value = memberResult.items
  workflows.value = wfResult.items
  loadingMembers.value = false
  loadingWorkflows.value = false
})
</script>
