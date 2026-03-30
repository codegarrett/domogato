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

    <div class="flex justify-content-between align-items-center mt-3 mb-3">
      <h3 class="m-0">{{ $t('orgs.members') }}</h3>
      <Button :label="$t('orgs.addMember')" icon="pi pi-user-plus" size="small" @click="showAddMemberDialog = true" />
    </div>
    <DataTable :value="members" :loading="loadingMembers" stripedRows class="p-datatable-sm">
      <Column field="display_name" :header="$t('common.name')" />
      <Column field="email" :header="$t('common.email')" />
      <Column field="role" :header="$t('common.role')">
        <template #body="{ data }">
          <Select
            :model-value="data.role"
            :options="projectRoleOptions"
            option-label="label"
            option-value="value"
            class="p-inputtext-sm"
            @update:model-value="(role: string) => changeProjectMemberRole(data, role)"
          />
        </template>
      </Column>
      <Column style="width: 4rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            @click="confirmRemoveProjectMember(data)"
          />
        </template>
      </Column>
    </DataTable>

    <MemberPickerDialog
      v-model:visible="showAddMemberDialog"
      :header="$t('orgs.addMember')"
      :role-options="projectRoleOptions"
      default-role="developer"
      :exclude-user-ids="memberUserIds"
      :search-fn="searchOrgMembersForProject"
      ref="projectPickerRef"
      @add="handleAddProjectMember"
    />
  </div>
  <div v-else class="flex justify-content-center p-5">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import MemberPickerDialog from '@/components/common/MemberPickerDialog.vue'
import type { PickerUser } from '@/components/common/MemberPickerDialog.vue'
import { getProject, updateProject, listProjectMembers, addProjectMember, updateProjectMemberRole, removeProjectMember, type Project, type ProjectMember } from '@/api/projects'
import { listOrgMembers } from '@/api/organizations'
import { listWorkflows, type Workflow } from '@/api/workflows'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const route = useRoute()
const projectId = route.params.projectId as string

const project = ref<Project | null>(null)
const members = ref<ProjectMember[]>([])
const loadingMembers = ref(false)

const showAddMemberDialog = ref(false)
const projectPickerRef = ref<InstanceType<typeof MemberPickerDialog> | null>(null)
const orgMembersCache = ref<PickerUser[]>([])
const orgMembersCacheLoaded = ref(false)

const memberUserIds = computed(() => members.value.map(m => m.user_id))

const projectRoleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Maintainer', value: 'maintainer' },
  { label: 'Developer', value: 'developer' },
  { label: 'Reporter', value: 'reporter' },
  { label: 'Guest', value: 'guest' },
]

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

async function searchOrgMembersForProject(q: string): Promise<PickerUser[]> {
  if (!project.value) return []
  if (!orgMembersCacheLoaded.value) {
    const res = await listOrgMembers(project.value.organization_id, 0, 200)
    orgMembersCache.value = res.items.map(om => ({
      id: om.user_id,
      display_name: om.display_name,
      email: om.email,
      avatar_url: om.avatar_url,
    }))
    orgMembersCacheLoaded.value = true
  }
  const lower = q.toLowerCase()
  return orgMembersCache.value.filter(
    u => u.display_name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
  )
}

async function handleAddProjectMember(payload: { userId: string; email: string; role: string }) {
  try {
    const added = await addProjectMember(projectId, { user_id: payload.userId, role: payload.role })
    members.value.push(added)
    showAddMemberDialog.value = false
    toast.showSuccess(t('common.success'), t('admin.memberAdded'))
  } catch {
    toast.showError(t('common.error'), t('orgs.addMemberFailed'))
  } finally {
    projectPickerRef.value?.resetAdding()
  }
}

async function changeProjectMemberRole(member: ProjectMember, role: string) {
  try {
    await updateProjectMemberRole(projectId, member.user_id, role)
    member.role = role
    toast.showSuccess(t('common.success'), t('common.saved'))
  } catch {
    toast.showError(t('common.error'), t('common.saveFailed'))
  }
}

async function confirmRemoveProjectMember(member: ProjectMember) {
  if (!confirm(t('orgs.confirmRemoveMember', { name: member.display_name || member.email }))) return
  try {
    await removeProjectMember(projectId, member.user_id)
    members.value = members.value.filter(m => m.id !== member.id)
    toast.showSuccess(t('common.success'), t('admin.memberRemoved'))
  } catch {
    toast.showError(t('common.error'), t('orgs.removeMemberFailed'))
  }
}
</script>

