import { getTicketChildren } from '@/api/tickets'
import type { Ticket } from '@/api/tickets'

/** Count descendants of the selection that are not already selected. */
export async function countUnselectedDescendants(selected: Ticket[]): Promise<number> {
  const selectedIds = new Set(selected.map((t) => t.id))
  const counted = new Set<string>()
  let total = 0

  async function walk(parentId: string) {
    const children = await getTicketChildren(parentId)
    for (const child of children) {
      if (counted.has(child.id)) continue
      counted.add(child.id)
      if (!selectedIds.has(child.id)) total += 1
      await walk(child.id)
    }
  }

  for (const ticket of selected) {
    await walk(ticket.id)
  }
  return total
}

/**
 * Ticket ids in safe delete order (descendants before ancestors).
 * When deleteSubtasks is false, only the selected tickets are returned.
 */
export async function orderedDeleteIds(
  selected: Ticket[],
  deleteSubtasks: boolean,
): Promise<string[]> {
  if (!deleteSubtasks) return selected.map((t) => t.id)

  const selectedIds = new Set(selected.map((t) => t.id))
  const ordered: string[] = []
  const seen = new Set<string>()

  async function walk(parentId: string) {
    const children = await getTicketChildren(parentId)
    for (const child of children) {
      await walk(child.id)
      if (!seen.has(child.id)) {
        seen.add(child.id)
        ordered.push(child.id)
      }
    }
  }

  const roots = selected.filter(
    (t) => !t.parent_ticket_id || !selectedIds.has(t.parent_ticket_id),
  )
  for (const root of roots) {
    await walk(root.id)
    if (!seen.has(root.id)) {
      seen.add(root.id)
      ordered.push(root.id)
    }
  }
  for (const t of selected) {
    if (!seen.has(t.id)) ordered.push(t.id)
  }
  return ordered
}
