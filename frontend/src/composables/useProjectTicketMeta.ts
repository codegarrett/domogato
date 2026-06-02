import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProject, listProjectMembers, type Project, type ProjectMember } from '@/api/projects'
import { listWorkflows, type Workflow, type WorkflowStatus } from '@/api/workflows'
import type { Ticket } from '@/api/tickets'

export function useProjectTicketMeta(
  projectId: () => string,
  externalProject?: Ref<Project | null>,
) {
  const { t } = useI18n()
  const internalProject = ref<Project | null>(null)
  const project = externalProject ?? internalProject
  const members = ref<ProjectMember[]>([])
  const workflows = ref<Workflow[]>([])

  const memberMap = computed(() => {
    const map = new Map<string, string>()
    for (const m of members.value) {
      map.set(m.user_id, m.display_name || m.email)
    }
    return map
  })

  const assigneeOptions = computed(() =>
    members.value.map((m) => ({
      label: m.display_name || m.email,
      value: m.user_id,
    })),
  )

  const statusMap = computed(() => {
    const map = new Map<string, WorkflowStatus>()
    for (const wf of workflows.value) {
      for (const s of wf.statuses) {
        map.set(s.id, s)
      }
    }
    return map
  })

  function resolveAssigneeName(id: string | null): string {
    if (!id) return '—'
    return memberMap.value.get(id) ?? '—'
  }

  function resolveStatusName(id: string): string {
    return statusMap.value.get(id)?.name ?? '—'
  }

  function resolveStatusStyle(id: string): Record<string, string> {
    const s = statusMap.value.get(id)
    if (!s?.color) return {}
    return { background: s.color, color: '#fff', borderColor: s.color }
  }

  function statusTransitionOptions(row: Ticket): { label: string; value: string }[] {
    const currentStatus = statusMap.value.get(row.workflow_status_id)
    const opts: { label: string; value: string }[] = []

    if (currentStatus) {
      opts.push({ label: `${currentStatus.name} (${t('common.current')})`, value: currentStatus.id })
    }

    for (const wf of workflows.value) {
      const hasStatus = wf.statuses.some((s) => s.id === row.workflow_status_id)
      if (!hasStatus) continue
      for (const tr of wf.transitions) {
        if (tr.from_status_id !== row.workflow_status_id) continue
        const target = statusMap.value.get(tr.to_status_id)
        if (target) {
          opts.push({ label: target.name, value: target.id })
        }
      }
    }

    return opts
  }

  async function loadProject() {
    try {
      project.value = await getProject(projectId())
    } catch {
      project.value = null
    }
  }

  async function loadMembers() {
    try {
      const res = await listProjectMembers(projectId(), 0, 200)
      members.value = res.items
    } catch {
      members.value = []
    }
  }

  async function loadWorkflows() {
    if (!project.value) return
    try {
      const res = await listWorkflows(project.value.organization_id, 0, 100)
      workflows.value = res.items
    } catch {
      workflows.value = []
    }
  }

  async function loadMeta() {
    await loadProject()
    await Promise.all([loadMembers(), loadWorkflows()])
  }

  return {
    project,
    members,
    workflows,
    memberMap,
    assigneeOptions,
    statusMap,
    resolveAssigneeName,
    resolveStatusName,
    resolveStatusStyle,
    statusTransitionOptions,
    loadProject,
    loadMembers,
    loadWorkflows,
    loadMeta,
  }
}
