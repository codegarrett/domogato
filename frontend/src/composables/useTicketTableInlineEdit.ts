import { computed, ref, type Ref } from 'vue'
import { transitionStatus, updateTicket, type Ticket, type TicketUpdate } from '@/api/tickets'

export interface InlineEdit {
  id: string
  field: string
  value: string | number | null
}

export function useTicketTableInlineEdit(options?: {
  onTicketUpdated?: (updated: Ticket) => void
}) {
  const editingCell = ref<InlineEdit | null>(null)

  const inlineEditValue = computed({
    get(): string | null {
      return (editingCell.value?.value as string | null) ?? null
    },
    set(v: string | null) {
      if (editingCell.value) editingCell.value.value = v
    },
  })

  const storyPointsEditModel = computed({
    get(): number | null {
      const c = editingCell.value
      if (!c || c.field !== 'story_points') return null
      return c.value == null ? null : Number(c.value)
    },
    set(next: number | null) {
      if (editingCell.value?.field === 'story_points') editingCell.value.value = next
    },
  })

  function startEdit(row: Ticket, field: string, currentValue: string | number | null) {
    editingCell.value = { id: row.id, field, value: currentValue }
  }

  function cancelEdit() {
    editingCell.value = null
  }

  function onEditValueUpdate(v: string | number | null) {
    if (editingCell.value) editingCell.value.value = v
  }

  async function commitEdit(row: Ticket) {
    const cell = editingCell.value
    if (!cell) return
    const newVal = cell.value
    const payload: TicketUpdate = {}
    let changed = false

    if (cell.field === 'title') {
      const trimmed = String(newVal ?? '').trim()
      if (!trimmed || trimmed === row.title) {
        cancelEdit()
        return
      }
      payload.title = trimmed
      changed = true
    } else if (cell.field === 'ticket_type' && newVal !== row.ticket_type) {
      payload.ticket_type = newVal as string
      changed = true
    } else if (cell.field === 'priority' && newVal !== row.priority) {
      payload.priority = newVal as string
      changed = true
    } else if (cell.field === 'story_points') {
      const n = (newVal as number | null) ?? null
      if (n !== (row.story_points ?? null)) {
        payload.story_points = n
        changed = true
      }
    } else if (cell.field === 'assignee_id') {
      const next = (newVal as string | null) ?? null
      if (next !== row.assignee_id) {
        payload.assignee_id = next
        changed = true
      }
    }

    if (changed) {
      try {
        const updated = await updateTicket(row.id, payload)
        options?.onTicketUpdated?.(updated)
      } catch (e) {
        console.error(e)
      }
    }
    cancelEdit()
  }

  async function commitStatusEdit(row: Ticket) {
    const cell = editingCell.value
    if (!cell || cell.field !== 'workflow_status_id') return
    const newStatusId = cell.value as string
    if (!newStatusId || newStatusId === row.workflow_status_id) {
      cancelEdit()
      return
    }
    try {
      const updated = await transitionStatus(row.id, { workflow_status_id: newStatusId })
      options?.onTicketUpdated?.(updated)
    } catch (e) {
      console.error(e)
    }
    cancelEdit()
  }

  return {
    editingCell,
    inlineEditValue,
    storyPointsEditModel,
    startEdit,
    cancelEdit,
    onEditValueUpdate,
    commitEdit,
    commitStatusEdit,
  }
}

/** Patch a ticket inside a ref-backed list by id. */
export function patchTicketInList(list: Ref<Ticket[]>, ticketId: string, updated: Ticket) {
  list.value = list.value.map((t) => (t.id === ticketId ? updated : t))
}
