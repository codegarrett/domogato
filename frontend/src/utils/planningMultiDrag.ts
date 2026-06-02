import type { Ticket } from '@/api/tickets'

/** IDs to move together: all selected in the list when dragging a selected row, else just the dragged row. */
export function dragGroupIds(
  draggedId: string,
  list: Ticket[],
  selectedIds: Set<string>,
): string[] {
  const inList = list.filter((t) => selectedIds.has(t.id)).map((t) => t.id)
  if (inList.length > 1 && inList.includes(draggedId)) return inList
  return [draggedId]
}

export function applyIntraListGroupMove(list: Ticket[], newIndex: number, groupIds: string[]) {
  if (groupIds.length <= 1) return

  const group = groupIds
    .map((id) => list.find((t) => t.id === id))
    .filter((t): t is Ticket => !!t)
    .sort((a, b) => list.indexOf(a) - list.indexOf(b))

  for (const t of group) {
    const idx = list.indexOf(t)
    if (idx >= 0) list.splice(idx, 1)
  }

  list.splice(newIndex, 0, ...group)
}

/** After a cross-list drag, pull the rest of the group into the target list after the primary ticket. */
export function appendGroupToTargetList(
  targetList: Ticket[],
  primaryId: string,
  groupIds: string[],
  pullTicket: (id: string) => Ticket | undefined,
) {
  if (groupIds.length <= 1) return

  const anchorIdx = targetList.findIndex((t) => t.id === primaryId)
  if (anchorIdx < 0) return

  let insertAt = anchorIdx + 1
  for (const id of groupIds) {
    if (id === primaryId || targetList.some((t) => t.id === id)) continue
    const ticket = pullTicket(id)
    if (ticket) targetList.splice(insertAt++, 0, ticket)
  }
}
