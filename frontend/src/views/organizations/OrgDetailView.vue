<template>
  <div v-if="org">
    <div class="flex justify-content-between align-items-center mb-4">
      <div>
        <h2>{{ org.name }}</h2>
        <p class="text-color-secondary">{{ org.description }}</p>
      </div>
    </div>

    <TabView>
      <TabPanel value="0" :header="$t('orgs.projects')">
        <div class="flex justify-content-between align-items-center mb-3">
          <h3>{{ $t('orgs.projects') }}</h3>
          <Button :label="$t('orgs.newProject')" icon="pi pi-plus" size="small" @click="showProjectDialog = true" />
        </div>
        <DataTable :value="projects" :loading="loadingProjects" stripedRows class="p-datatable-sm">
          <Column field="key" :header="$t('projects.key')" style="width: 80px">
            <template #body="{ data }">
              <Tag :value="data.key" severity="info" />
            </template>
          </Column>
          <Column field="name" :header="$t('common.name')">
            <template #body="{ data }">
              <router-link :to="`/projects/${data.id}`" class="font-semibold">{{ data.name }}</router-link>
            </template>
          </Column>
          <Column field="visibility" :header="$t('common.visibility')">
            <template #body="{ data }">
              <Tag :value="data.visibility" :severity="data.visibility === 'private' ? 'danger' : 'success'" />
            </template>
          </Column>
          <Column field="created_at" :header="$t('common.created')">
            <template #body="{ data }">{{ new Date(data.created_at).toLocaleDateString() }}</template>
          </Column>
        </DataTable>
      </TabPanel>
      <TabPanel value="1" :header="$t('orgs.members')">
        <div class="flex justify-content-between align-items-center mb-3">
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
                :options="orgRoleOptions"
                option-label="label"
                option-value="value"
                class="p-inputtext-sm"
                @update:model-value="(role: string) => changeOrgMemberRole(data, role)"
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
                @click="confirmRemoveOrgMember(data)"
              />
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>

    <Dialog v-model:visible="showProjectDialog" :header="$t('projects.createProject')" modal :style="{ width: '450px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>{{ $t('projects.projectName') }}</label>
          <InputText v-model="newProject.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('projects.keyHelp') }}</label>
          <InputText v-model="newProject.key" :placeholder="$t('projects.keyPlaceholder')" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('common.description') }}</label>
          <Textarea v-model="newProject.description" rows="3" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('common.visibility') }}</label>
          <Select v-model="newProject.visibility" :options="['private', 'internal']" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="showProjectDialog = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="creatingProject" @click="handleCreateProject" />
      </template>
    </Dialog>
    <Dialog v-model:visible="showAddMemberDialog" :header="$t('orgs.addMember')" modal :style="{ width: '420px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>{{ $t('admin.memberEmail') }}</label>
          <InputText v-model="newMemberEmail" :placeholder="$t('admin.memberEmail')" autofocus @keyup.enter="handleAddOrgMember" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('common.role') }}</label>
          <Select v-model="newMemberRole" :options="orgRoleOptions" option-label="label" option-value="value" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="showAddMemberDialog = false" />
        <Button :label="$t('common.add')" icon="pi pi-user-plus" :loading="addingMember" :disabled="!newMemberEmail.trim()" @click="handleAddOrgMember" />
      </template>
    </Dialog>
  </div>
  <div v-else>
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { getOrganization, listOrgMembers, addOrgMember, updateOrgMemberRole, removeOrgMember, type Organization, type OrgMember } from '@/api/organizations'
import { listProjects, createProject, type Project } from '@/api/projects'
import { useToastService } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToastService()
const route = useRoute()
const orgId = route.params.orgId as string

const org = ref<Organization | null>(null)
const projects = ref<Project[]>([])
const members = ref<OrgMember[]>([])
const loadingProjects = ref(false)
const loadingMembers = ref(false)
const showProjectDialog = ref(false)
const creatingProject = ref(false)
const newProject = ref({ name: '', key: '', description: '', visibility: 'private' })

const showAddMemberDialog = ref(false)
const newMemberEmail = ref('')
const newMemberRole = ref('member')
const addingMember = ref(false)

const orgRoleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
]

onMounted(async () => {
  org.value = await getOrganization(orgId)
  loadingProjects.value = true
  loadingMembers.value = true
  const [projResult, memberResult] = await Promise.all([
    listProjects(orgId),
    listOrgMembers(orgId),
  ])
  projects.value = projResult.items
  members.value = memberResult.items
  loadingProjects.value = false
  loadingMembers.value = false
})

async function handleCreateProject() {
  creatingProject.value = true
  try {
    await createProject(orgId, {
      name: newProject.value.name,
      key: newProject.value.key.toUpperCase(),
      description: newProject.value.description || undefined,
      visibility: newProject.value.visibility,
    })
    showProjectDialog.value = false
    newProject.value = { name: '', key: '', description: '', visibility: 'private' }
    const result = await listProjects(orgId)
    projects.value = result.items
  } finally {
    creatingProject.value = false
  }
}

async function handleAddOrgMember() {
  if (!newMemberEmail.value.trim()) return
  addingMember.value = true
  try {
    const added = await addOrgMember(orgId, { email: newMemberEmail.value.trim(), role: newMemberRole.value })
    members.value.push(added)
    newMemberEmail.value = ''
    newMemberRole.value = 'member'
    showAddMemberDialog.value = false
    toast.showSuccess(t('common.success'), t('admin.memberAdded'))
  } catch {
    toast.showError(t('common.error'), t('orgs.addMemberFailed'))
  } finally {
    addingMember.value = false
  }
}

async function changeOrgMemberRole(member: OrgMember, role: string) {
  try {
    await updateOrgMemberRole(orgId, member.user_id, role)
    member.role = role
    toast.showSuccess(t('common.success'), t('common.saved'))
  } catch {
    toast.showError(t('common.error'), t('common.saveFailed'))
  }
}

async function confirmRemoveOrgMember(member: OrgMember) {
  if (!confirm(t('orgs.confirmRemoveMember', { name: member.display_name || member.email }))) return
  try {
    await removeOrgMember(orgId, member.user_id)
    members.value = members.value.filter(m => m.id !== member.id)
    toast.showSuccess(t('common.success'), t('admin.memberRemoved'))
  } catch {
    toast.showError(t('common.error'), t('orgs.removeMemberFailed'))
  }
}
</script>
