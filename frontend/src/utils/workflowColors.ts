export const WORKFLOW_COLOR_INITIAL = '#6B7280'
export const WORKFLOW_COLOR_IN_PROGRESS = '#3B82F6'
export const WORKFLOW_COLOR_TERMINAL = '#10B981'

export interface WorkflowStatusColorInput {
  category: string
  is_initial?: boolean
  is_terminal?: boolean
}

export function defaultWorkflowStatusColor(input: WorkflowStatusColorInput): string {
  if (input.is_terminal) return WORKFLOW_COLOR_TERMINAL
  if (input.is_initial) return WORKFLOW_COLOR_INITIAL
  if (input.category === 'in_progress') return WORKFLOW_COLOR_IN_PROGRESS
  if (input.category === 'done') return WORKFLOW_COLOR_TERMINAL
  return WORKFLOW_COLOR_INITIAL
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(107, 114, 128, ${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function workflowColumnHeaderStyle(color: string): Record<string, string> {
  return {
    background: hexToRgba(color, 0.14),
    borderBottom: `1px solid ${hexToRgba(color, 0.25)}`,
  }
}
