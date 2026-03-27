<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listTicketLinks,
  createTicketLink,
  deleteTicketLink,
  type PageTicketLink,
} from '@/api/kb'
import { listTickets, type Ticket } from '@/api/tickets'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'

const props = defineProps<{
  pageId: string
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'linkCountChanged', count: number): void
}>()

const { t } = useI18n()

const links = ref<PageTicketLink[]>([])
const loading = ref(false)
const showLinkDialog = ref(false)
const searchTerm = ref('')
const searchResults = ref<Ticket[]>([])
const searching = ref(false)
const linking = ref<string | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  try {
    links.value = await listTicketLinks(props.pageId)
    emit('linkCountChanged', links.value.length)
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(() => props.pageId, load)

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = searchTerm.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const result = await listTickets(props.projectId, { search: q, limit: 15 })
      const linkedIds = new Set(links.value.map((l) => l.ticket_id))
      searchResults.value = result.items.filter((t: Ticket) => !linkedIds.has(t.id))
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
}

async function linkTicket(ticket: Ticket) {
  linking.value = ticket.id
  try {
    await createTicketLink(props.pageId, { ticket_id: ticket.id })
    searchResults.value = searchResults.value.filter((t) => t.id !== ticket.id)
    await load()
  } finally {
    linking.value = null
  }
}

async function unlinkTicket(link: PageTicketLink) {
  await deleteTicketLink(props.pageId, link.id)
  await load()
}

function prioritySeverity(p: string) {
  switch (p) {
    case 'critical': return 'danger'
    case 'high': return 'warn'
    case 'medium': return 'info'
    case 'low': return 'secondary'
    default: return 'secondary'
  }
}
</script>

<template>
  <div class="story-ticket-links">
    <div class="flex align-items-center justify-content-between mb-2">
      <div class="flex align-items-center gap-2">
        <i class="pi pi-link text-primary" />
        <span class="text-sm font-semibold">{{ t('kb.linkedTickets') }}</span>
        <Tag :value="String(links.length)" severity="secondary" rounded class="text-xs" />
      </div>
      <Button
        icon="pi pi-plus"
        :label="t('kb.linkTicket')"
        size="small"
        text
        @click="showLinkDialog = true"
      />
    </div>

    <DataTable v-if="links.length" :value="links" size="small" class="text-sm" :rows="20">
      <Column field="ticket_key" :header="t('tickets.key')" style="width: 7rem">
        <template #body="{ data }">
          <span class="font-mono text-primary font-semibold">{{ data.ticket_key }}</span>
        </template>
      </Column>
      <Column field="ticket_title" :header="t('tickets.title')" />
      <Column field="ticket_priority" :header="t('tickets.priority')" style="width: 6rem">
        <template #body="{ data }">
          <Tag v-if="data.ticket_priority" :value="data.ticket_priority" :severity="prioritySeverity(data.ticket_priority)" />
        </template>
      </Column>
      <Column field="ticket_status" :header="t('tickets.status')" style="width: 8rem">
        <template #body="{ data }">
          <Tag
            v-if="data.ticket_status"
            :value="data.ticket_status"
            :style="data.ticket_status_color ? { background: data.ticket_status_color, color: '#fff' } : {}"
          />
        </template>
      </Column>
      <Column style="width: 3rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            @click="unlinkTicket(data)"
          />
        </template>
      </Column>
    </DataTable>

    <div v-else-if="!loading" class="text-color-secondary text-sm py-2">
      {{ t('kb.noLinkedTickets') }}
    </div>

    <!-- Link dialog -->
    <Dialog
      v-model:visible="showLinkDialog"
      :header="t('kb.linkTicket')"
      modal
      :style="{ width: '32rem', maxWidth: '95vw' }"
    >
      <div class="mb-3">
        <InputText
          v-model="searchTerm"
          :placeholder="t('kb.searchTickets')"
          class="w-full"
          autofocus
          @input="onSearchInput"
        />
      </div>

      <div v-if="searching" class="text-center py-3">
        <i class="pi pi-spin pi-spinner" />
      </div>

      <div v-else-if="searchResults.length" class="search-ticket-list">
        <div
          v-for="ticket in searchResults"
          :key="ticket.id"
          class="flex align-items-center justify-content-between py-2 px-2 border-bottom-1 surface-border hover:surface-50 cursor-pointer"
        >
          <div class="flex-1">
            <span class="font-mono text-primary mr-2 text-sm">{{ ticket.ticket_number }}</span>
            <span class="text-sm">{{ ticket.title }}</span>
          </div>
          <Button
            icon="pi pi-plus"
            size="small"
            text
            :loading="linking === ticket.id"
            @click="linkTicket(ticket)"
          />
        </div>
      </div>

      <div v-else-if="searchTerm.trim()" class="text-color-secondary text-sm py-3 text-center">
        {{ t('kb.noResults') }}
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.search-ticket-list {
  max-height: 300px;
  overflow-y: auto;
}
</style>
