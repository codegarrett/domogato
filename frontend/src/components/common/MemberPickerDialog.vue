<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="header" modal :style="{ width: '480px' }">
    <div class="flex flex-column gap-3 pt-2">
      <InputText
        v-model="searchQuery"
        :placeholder="$t('admin.searchUsers')"
        class="w-full"
        autofocus
        @input="onSearchInput"
      />

      <div v-if="searching" class="flex justify-content-center py-3">
        <i class="pi pi-spin pi-spinner" />
      </div>

      <div v-else-if="visibleUsers.length === 0" class="text-color-secondary text-sm py-3 text-center">
        {{ searchQuery.trim() ? $t('search.noResults') : $t('orgs.typeToSearch') }}
      </div>

      <div v-else class="member-picker-list">
        <div
          v-for="u in visibleUsers"
          :key="u.id"
          class="member-picker-item"
          :class="{ selected: selectedUser?.id === u.id }"
          @click="selectedUser = u"
        >
          <Avatar
            v-if="u.avatar_url"
            :image="u.avatar_url"
            shape="circle"
            size="normal"
          />
          <Avatar
            v-else
            :label="initials(u.display_name)"
            shape="circle"
            size="normal"
            class="bg-primary text-white"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-overflow-ellipsis white-space-nowrap overflow-hidden">{{ u.display_name }}</div>
            <div class="text-xs text-color-secondary text-overflow-ellipsis white-space-nowrap overflow-hidden">{{ u.email }}</div>
          </div>
        </div>
      </div>

      <div v-if="selectedUser" class="flex flex-column gap-1">
        <label class="text-sm font-semibold">{{ $t('common.role') }}</label>
        <Select v-model="selectedRole" :options="roleOptions" option-label="label" option-value="value" class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button :label="$t('common.cancel')" text @click="close" />
      <Button :label="$t('common.add')" icon="pi pi-user-plus" :loading="adding" :disabled="!selectedUser" @click="handleAdd" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Avatar from 'primevue/avatar'

export interface PickerUser {
  id: string
  display_name: string
  email: string
  avatar_url?: string | null
}

const props = defineProps<{
  visible: boolean
  header: string
  roleOptions: { label: string; value: string }[]
  defaultRole: string
  excludeUserIds: string[]
  searchFn: (q: string) => Promise<PickerUser[]>
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'add', payload: { userId: string; email: string; role: string }): void
}>()

const searchQuery = ref('')
const allResults = ref<PickerUser[]>([])
const searching = ref(false)
const selectedUser = ref<PickerUser | null>(null)
const selectedRole = ref(props.defaultRole)
const adding = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const visibleUsers = computed(() => {
  const excluded = new Set(props.excludeUserIds)
  return allResults.value.filter(u => !excluded.has(u.id))
})

watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    allResults.value = []
    selectedUser.value = null
    selectedRole.value = props.defaultRole
    adding.value = false
  }
})

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = searchQuery.value.trim()
  if (q.length < 2) {
    allResults.value = []
    selectedUser.value = null
    return
  }
  debounceTimer = setTimeout(() => doSearch(q), 300)
}

async function doSearch(q: string) {
  searching.value = true
  try {
    allResults.value = await props.searchFn(q)
    if (selectedUser.value && !allResults.value.some(u => u.id === selectedUser.value!.id)) {
      selectedUser.value = null
    }
  } catch {
    allResults.value = []
  } finally {
    searching.value = false
  }
}

function close() {
  emit('update:visible', false)
}

function handleAdd() {
  if (!selectedUser.value) return
  adding.value = true
  emit('add', {
    userId: selectedUser.value.id,
    email: selectedUser.value.email,
    role: selectedRole.value,
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

defineExpose({ resetAdding: () => { adding.value = false } })
</script>

<style scoped>
.member-picker-list {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: 6px;
}

.member-picker-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--p-surface-50);
}

.member-picker-item:last-child {
  border-bottom: none;
}

.member-picker-item:hover {
  background: var(--app-hover-bg);
}

.member-picker-item.selected {
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
  outline: 2px solid var(--p-primary-color);
  outline-offset: -2px;
}
</style>
