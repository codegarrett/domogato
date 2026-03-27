<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.orgManagement') }}</h1>
      <AdminSubNav />
    </div>

    <div class="admin-toolbar">
      <Button :label="t('orgs.createOrg')" icon="pi pi-plus" size="small" @click="showCreateDialog = true" />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="orgs"
      size="small"
      class="text-sm"
      :rows="limit"
      :lazy="true"
      :total-records="total"
      :first="offset"
      paginator
      :rows-per-page-options="[25, 50, 100]"
      @page="onPage"
      :row-class="() => 'clickable-row'"
      @row-click="onRowClick"
    >
      <Column :header="t('common.name')" field="name" style="min-width: 14rem" />
      <Column :header="t('orgs.slug')" field="slug" style="width: 10rem">
        <template #body="{ data }">
          <code class="slug-code">{{ data.slug }}</code>
        </template>
      </Column>
      <Column :header="t('common.status')" style="width: 7rem">
        <template #body="{ data }">
          <Tag v-if="data.is_active" :value="t('common.active')" severity="success" />
          <Tag v-else :value="t('common.inactive')" severity="danger" />
        </template>
      </Column>
      <Column :header="t('common.created')" style="width: 10rem">
        <template #body="{ data }">
          {{ formatDate(data.created_at) }}
        </template>
      </Column>
      <Column style="width: 3rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-users"
            size="small"
            text
            v-tooltip.top="t('admin.manageMembers')"
            @click.stop="openMembersDialog(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Create Org Dialog -->
    <Dialog v-model:visible="showCreateDialog" :header="t('orgs.createOrg')" modal :style="{ width: '28rem' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('common.name') }}</label>
          <InputText v-model="newOrg.name" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('orgs.slug') }}</label>
          <InputText v-model="newOrg.slug" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('common.description') }}</label>
          <Textarea v-model="newOrg.description" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="showCreateDialog = false" />
        <Button :label="t('common.create')" @click="onCreate" :loading="creating" />
      </template>
    </Dialog>

    <!-- Members Dialog -->
    <Dialog v-model:visible="showMembersDialog" :header="selectedOrg?.name + ' — ' + t('orgs.members')" modal :style="{ width: '36rem' }">
      <div v-if="membersLoading" class="flex justify-content-center py-4">
        <ProgressSpinner />
      </div>
      <template v-else>
        <div class="mb-3 flex gap-2">
          <InputText v-model="newMemberEmail" :placeholder="t('admin.memberEmail')" class="flex-1" size="small" />
          <Select v-model="newMemberRole" :options="roleOptions" option-label="label" option-value="value" size="small" class="w-8rem" />
          <Button icon="pi pi-plus" size="small" @click="onAddMember" :loading="addingMember" />
        </div>
        <DataTable :value="members" size="small" class="text-sm">
          <Column :header="t('common.name')" field="display_name" />
          <Column :header="t('common.email')" field="email" />
          <Column :header="t('common.role')" style="width: 8rem">
            <template #body="{ data }">
              <Select
                :model-value="data.role"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                size="small"
                @change="(e: any) => onRoleChange(data, e.value)"
              />
            </template>
          </Column>
          <Column style="width: 3rem">
            <template #body="{ data }">
              <Button icon="pi pi-trash" size="small" text severity="danger" @click="onRemoveMember(data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import {
  listOrganizations,
  createOrganization,
  listOrgMembers,
  addOrgMember,
  updateOrgMemberRole,
  removeOrgMember,
  type Organization,
  type OrgMember,
} from '@/api/organizations'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const toast = useToastService()

const orgs = ref<Organization[]>([])
const total = ref(0)
const offset = ref(0)
const limit = ref(50)
const loading = ref(false)

const showCreateDialog = ref(false)
const creating = ref(false)
const newOrg = ref({ name: '', slug: '', description: '' })

const showMembersDialog = ref(false)
const selectedOrg = ref<Organization | null>(null)
const members = ref<OrgMember[]>([])
const membersLoading = ref(false)
const newMemberEmail = ref('')
const newMemberRole = ref('member')
const addingMember = ref(false)

const roleOptions = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
  { label: 'Owner', value: 'owner' },
]

onMounted(() => loadOrgs())

async function loadOrgs() {
  loading.value = true
  try {
    const res = await listOrganizations(offset.value, limit.value)
    orgs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function onPage(event: any) {
  offset.value = event.first
  limit.value = event.rows
  loadOrgs()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function onRowClick(event: any) {
  router.push(`/organizations/${event.data.id}`)
}

async function onCreate() {
  if (!newOrg.value.name.trim()) return
  creating.value = true
  try {
    await createOrganization({
      name: newOrg.value.name.trim(),
      slug: newOrg.value.slug.trim() || undefined,
      description: newOrg.value.description.trim() || undefined,
    })
    showCreateDialog.value = false
    newOrg.value = { name: '', slug: '', description: '' }
    toast.showSuccess(t('common.success'), t('admin.orgCreated'))
    await loadOrgs()
  } finally {
    creating.value = false
  }
}

async function openMembersDialog(org: Organization) {
  selectedOrg.value = org
  showMembersDialog.value = true
  membersLoading.value = true
  try {
    const res = await listOrgMembers(org.id, 0, 200)
    members.value = res.items
  } finally {
    membersLoading.value = false
  }
}

async function onAddMember() {
  if (!newMemberEmail.value.trim() || !selectedOrg.value) return
  addingMember.value = true
  try {
    const added = await addOrgMember(selectedOrg.value.id, { email: newMemberEmail.value.trim(), role: newMemberRole.value })
    members.value.push(added)
    newMemberEmail.value = ''
    toast.showSuccess(t('common.success'), t('admin.memberAdded'))
  } finally {
    addingMember.value = false
  }
}

async function onRoleChange(member: OrgMember, role: string) {
  if (!selectedOrg.value) return
  try {
    await updateOrgMemberRole(selectedOrg.value.id, member.user_id, role)
    member.role = role
  } catch {
    // handled by interceptor
  }
}

async function onRemoveMember(member: OrgMember) {
  if (!selectedOrg.value) return
  try {
    await removeOrgMember(selectedOrg.value.id, member.user_id)
    members.value = members.value.filter((m) => m.id !== member.id)
    toast.showSuccess(t('common.success'), t('admin.memberRemoved'))
  } catch {
    // handled by interceptor
  }
}
</script>

<style scoped>
.admin-page {
  max-width: 1000px;
  margin: 0 auto;
}
.admin-header {
  margin-bottom: 1.25rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.admin-toolbar {
  margin-bottom: 1rem;
}
.slug-code {
  font-size: 0.75rem;
  background: var(--app-card-alt-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}
:deep(.clickable-row) {
  cursor: pointer;
}
</style>
