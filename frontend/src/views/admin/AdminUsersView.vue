<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.userManagement') }}</h1>
      <AdminSubNav />
    </div>

    <div class="admin-toolbar">
      <InputText
        v-model="searchQuery"
        :placeholder="t('admin.searchUsers')"
        class="search-input"
        @input="debouncedSearch"
      />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="users"
      size="small"
      class="text-sm"
      :rows="limit"
      :lazy="true"
      :total-records="total"
      :first="offset"
      paginator
      :rows-per-page-options="[25, 50, 100]"
      @page="onPage"
    >
      <Column style="width: 3rem">
        <template #body="{ data }">
          <Avatar
            v-if="data.avatar_url"
            :image="data.avatar_url"
            shape="circle"
            size="normal"
          />
          <Avatar
            v-else
            :label="data.display_name?.charAt(0)?.toUpperCase() ?? '?'"
            shape="circle"
            size="normal"
          />
        </template>
      </Column>
      <Column :header="t('profile.displayName')" field="display_name" style="min-width: 12rem" />
      <Column :header="t('common.email')" field="email" style="min-width: 14rem" />
      <Column :header="t('common.role')" style="width: 8rem">
        <template #body="{ data }">
          <Tag v-if="data.is_system_admin" value="Admin" severity="warn" />
          <Tag v-else value="User" severity="info" />
        </template>
      </Column>
      <Column :header="t('common.status')" style="width: 7rem">
        <template #body="{ data }">
          <Tag v-if="data.is_active" :value="t('common.active')" severity="success" />
          <Tag v-else :value="t('common.inactive')" severity="danger" />
        </template>
      </Column>
      <Column :header="t('profile.lastLogin')" style="width: 10rem">
        <template #body="{ data }">
          {{ data.last_login_at ? formatDate(data.last_login_at) : '—' }}
        </template>
      </Column>
      <Column style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="data.is_active"
              v-tooltip.top="t('admin.deactivate')"
              icon="pi pi-ban"
              size="small"
              text
              severity="danger"
              @click="confirmToggleActive(data)"
            />
            <Button
              v-else
              v-tooltip.top="t('admin.activate')"
              icon="pi pi-check-circle"
              size="small"
              text
              severity="success"
              @click="confirmToggleActive(data)"
            />
            <Button
              v-if="!data.is_system_admin"
              v-tooltip.top="t('admin.grantAdmin')"
              icon="pi pi-shield"
              size="small"
              text
              severity="warn"
              @click="confirmToggleAdmin(data)"
            />
            <Button
              v-else
              v-tooltip.top="t('admin.revokeAdmin')"
              icon="pi pi-shield"
              size="small"
              text
              severity="secondary"
              @click="confirmToggleAdmin(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showConfirmDialog" :header="confirmTitle" modal :style="{ width: '28rem' }">
      <p class="text-sm">{{ confirmMessage }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="showConfirmDialog = false" />
        <Button :label="t('common.save')" :severity="confirmSeverity" @click="executeConfirm" :loading="confirmLoading" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import { listUsers, adminUpdateUser, type UserRead } from '@/api/users'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const users = ref<UserRead[]>([])
const total = ref(0)
const offset = ref(0)
const limit = ref(50)
const loading = ref(false)
const searchQuery = ref('')

const showConfirmDialog = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmSeverity = ref<'danger' | 'warn' | 'success'>('warn')
const confirmLoading = ref(false)
let confirmAction: (() => Promise<void>) | null = null

let searchTimeout: ReturnType<typeof setTimeout> | null = null

onMounted(() => loadUsers())

async function loadUsers() {
  loading.value = true
  try {
    const res = await listUsers(offset.value, limit.value, searchQuery.value || undefined)
    users.value = res.items
    total.value = res.total
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    offset.value = 0
    loadUsers()
  }, 300)
}

function onPage(event: any) {
  offset.value = event.first
  limit.value = event.rows
  loadUsers()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function confirmToggleActive(user: UserRead) {
  const action = user.is_active ? 'deactivate' : 'activate'
  confirmTitle.value = t(`admin.${action}User`)
  confirmMessage.value = t(`admin.${action}Confirm`, { name: user.display_name })
  confirmSeverity.value = user.is_active ? 'danger' : 'success'
  confirmAction = async () => {
    await adminUpdateUser(user.id, { is_active: !user.is_active })
    user.is_active = !user.is_active
    toast.showSuccess(t('common.success'), t(`admin.${action}d`))
  }
  showConfirmDialog.value = true
}

function confirmToggleAdmin(user: UserRead) {
  const action = user.is_system_admin ? 'revokeAdmin' : 'grantAdmin'
  confirmTitle.value = t(`admin.${action}Title`)
  confirmMessage.value = t(`admin.${action}Confirm`, { name: user.display_name })
  confirmSeverity.value = user.is_system_admin ? 'danger' : 'warn'
  confirmAction = async () => {
    await adminUpdateUser(user.id, { is_system_admin: !user.is_system_admin })
    user.is_system_admin = !user.is_system_admin
    toast.showSuccess(t('common.success'), t(`admin.${action}Done`))
  }
  showConfirmDialog.value = true
}

async function executeConfirm() {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    showConfirmDialog.value = false
  } catch {
    // handled by interceptor
  } finally {
    confirmLoading.value = false
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
.search-input {
  width: 100%;
  max-width: 24rem;
}
</style>
