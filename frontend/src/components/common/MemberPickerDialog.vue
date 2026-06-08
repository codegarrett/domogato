<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="header" modal :style="{ width: '480px' }">
    <div class="flex flex-column gap-3 pt-2">
      <label :for="searchId" class="sr-only">{{ $t('admin.searchUsers') }}</label>
      <InputText
        :id="searchId"
        v-model="searchQuery"
        :placeholder="$t('admin.searchUsers')"
        class="w-full"
        role="combobox"
        :aria-expanded="visibleUsers.length > 0"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        autofocus
        @input="onSearchInput"
        @keydown="onSearchKeydown"
      />

      <div v-if="searching" class="flex justify-content-center py-3">
        <i class="pi pi-spin pi-spinner" aria-hidden="true" />
      </div>

      <div v-else-if="visibleUsers.length === 0" class="text-color-secondary text-sm py-3 text-center">
        {{ searchQuery.trim() ? $t('search.noResults') : $t('orgs.typeToSearch') }}
      </div>

      <ul
        v-else
        :id="listboxId"
        class="member-picker-list"
        role="listbox"
      >
        <li
          v-for="(u, i) in visibleUsers"
          :id="`member-option-${i}`"
          :key="u.id"
          role="presentation"
        >
          <button
            type="button"
            class="member-picker-item"
            role="option"
            :aria-selected="selectedUser?.id === u.id"
            :class="{ selected: selectedUser?.id === u.id }"
            @click="selectedUser = u"
          >
            <Avatar
              v-if="u.avatar_url"
              :image="assetUrl(u.avatar_url)"
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
          </button>
        </li>
      </ul>

      <div v-if="selectedUser" class="flex flex-column gap-1">
        <label :for="roleId" class="text-sm font-semibold">{{ $t('common.role') }}</label>
        <Select :inputId="roleId" v-model="selectedRole" :options="roleOptions" option-label="label" option-value="value" class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button :label="$t('common.cancel')" text @click="close" />
      <Button :label="$t('common.add')" icon="pi pi-user-plus" :loading="adding" :disabled="!selectedUser" @click="handleAdd" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, useId } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Avatar from 'primevue/avatar'
import { assetUrl } from '@/utils/assetUrl'

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

const searchId = useId()
const listboxId = useId()
const roleId = useId()

const searchQuery = ref('')
const allResults = ref<PickerUser[]>([])
const searching = ref(false)
const selectedUser = ref<PickerUser | null>(null)
const selectedRole = ref(props.defaultRole)
const adding = ref(false)
const highlightIndex = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const visibleUsers = computed(() => {
  const excluded = new Set(props.excludeUserIds)
  return allResults.value.filter(u => !excluded.has(u.id))
})

const activeDescendantId = computed(() => {
  if (visibleUsers.value.length === 0) return undefined
  const idx = selectedUser.value
    ? visibleUsers.value.findIndex((u) => u.id === selectedUser.value!.id)
    : highlightIndex.value
  return idx >= 0 ? `member-option-${idx}` : undefined
})

watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    allResults.value = []
    selectedUser.value = null
    selectedRole.value = props.defaultRole
    adding.value = false
    highlightIndex.value = 0
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
    highlightIndex.value = 0
    if (selectedUser.value && !allResults.value.some(u => u.id === selectedUser.value!.id)) {
      selectedUser.value = null
    }
  } catch {
    allResults.value = []
  } finally {
    searching.value = false
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (visibleUsers.value.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, visibleUsers.value.length - 1)
    selectedUser.value = visibleUsers.value[highlightIndex.value] ?? null
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
    selectedUser.value = visibleUsers.value[highlightIndex.value] ?? null
  } else if (e.key === 'Enter' && selectedUser.value) {
    e.preventDefault()
    handleAdd()
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
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: 6px;
}

.member-picker-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
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

.member-picker-item:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: -2px;
}
</style>
