import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getProject, type Project } from '@/api/projects'

export type ProjectRole = 'guest' | 'reporter' | 'developer' | 'maintainer' | 'owner'

const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  guest: 10,
  reporter: 20,
  developer: 30,
  maintainer: 40,
  owner: 50,
}

const PERMISSION_MIN_ROLE: Record<string, ProjectRole> = {
  edit_user_story: 'reporter',
  create_user_story: 'reporter',
  create_ticket: 'developer',
  create_ticket_from_story: 'developer',
  create_ticket_from_issue_report: 'developer',
  update_ticket: 'developer',
  transition_ticket: 'reporter',
  create_issue_report: 'guest',
  manage_workflows: 'maintainer',
}

export function usePermissions() {
  const authStore = useAuthStore()

  const isSystemAdmin = computed(() => authStore.isSystemAdmin)

  function hasOrgRole(orgId: string, minRole: string): boolean {
    return authStore.hasOrgRole(orgId, minRole)
  }

  function resolveProjectRole(
    projectId: string,
    organizationId: string,
    visibility = 'internal',
  ): ProjectRole | null {
    if (authStore.isSystemAdmin) return 'owner'

    const explicit = authStore.currentUser?.project_memberships.find(
      (m) => m.project_id === projectId,
    )?.role as ProjectRole | undefined

    const orgMembership = authStore.currentUser?.org_memberships.find(
      (m) => m.organization_id === organizationId,
    )

    let orgImplicit: ProjectRole | null = null
    if (orgMembership) {
      if (orgMembership.role === 'owner') orgImplicit = 'owner'
      else if (orgMembership.role === 'admin') orgImplicit = 'maintainer'
      else if (orgMembership.role === 'member') {
        orgImplicit = visibility === 'internal' ? 'guest' : null
      }
    }

    const roles = [explicit, orgImplicit].filter((r): r is ProjectRole => Boolean(r))
    if (!roles.length) return null

    return roles.reduce((best, role) =>
      PROJECT_ROLE_HIERARCHY[role] > PROJECT_ROLE_HIERARCHY[best] ? role : best,
    )
  }

  function hasProjectRole(
    projectId: string,
    organizationId: string,
    minRole: ProjectRole,
    visibility = 'internal',
  ): boolean {
    const effective = resolveProjectRole(projectId, organizationId, visibility)
    if (!effective) return false
    return PROJECT_ROLE_HIERARCHY[effective] >= PROJECT_ROLE_HIERARCHY[minRole]
  }

  function canEditIssueReport(
    projectId: string,
    organizationId: string,
    reportCreatedBy: string | null | undefined,
    visibility = 'internal',
  ): boolean {
    if (authStore.isSystemAdmin) return true
    const userId = authStore.currentUser?.id
    if (hasProjectRole(projectId, organizationId, 'developer', visibility)) return true
    if (!userId || !reportCreatedBy) return false
    return (
      reportCreatedBy === userId
      && hasProjectRole(projectId, organizationId, 'reporter', visibility)
    )
  }

  function can(
    action: string,
    ctx: { projectId: string; organizationId: string; visibility?: string },
  ): boolean {
    if (authStore.isSystemAdmin) return true
    const minRole = PERMISSION_MIN_ROLE[action]
    if (!minRole) return false
    return hasProjectRole(
      ctx.projectId,
      ctx.organizationId,
      minRole,
      ctx.visibility ?? 'internal',
    )
  }

  return {
    isSystemAdmin,
    hasOrgRole,
    resolveProjectRole,
    hasProjectRole,
    canEditIssueReport,
    can,
  }
}

/** Loads project metadata and exposes role-gated permission flags for a project route. */
export function useProjectPermissions(projectId: MaybeRefOrGetter<string>) {
  const {
    resolveProjectRole,
    hasProjectRole,
    can,
    canEditIssueReport,
    isSystemAdmin,
  } = usePermissions()

  const project = ref<Project | null>(null)

  watch(
    () => toValue(projectId),
    async (id) => {
      if (!id) {
        project.value = null
        return
      }
      try {
        project.value = await getProject(id)
      } catch {
        project.value = null
      }
    },
    { immediate: true },
  )

  const organizationId = computed(() => project.value?.organization_id ?? '')
  const visibility = computed(() => project.value?.visibility ?? 'internal')

  const permissionCtx = computed(() => ({
    projectId: toValue(projectId),
    organizationId: organizationId.value,
    visibility: visibility.value,
  }))

  const effectiveRole = computed(() => {
    const ctx = permissionCtx.value
    if (!ctx.projectId || !ctx.organizationId) {
      return isSystemAdmin.value ? 'owner' as ProjectRole : null
    }
    return resolveProjectRole(ctx.projectId, ctx.organizationId, ctx.visibility)
  })

  const canEditUserStory = computed(() =>
    can('edit_user_story', permissionCtx.value),
  )
  const canCreateUserStory = computed(() =>
    can('create_user_story', permissionCtx.value),
  )
  const canCreateTicket = computed(() =>
    can('create_ticket', permissionCtx.value),
  )
  const canCreateTicketFromStory = computed(() =>
    can('create_ticket_from_story', permissionCtx.value),
  )
  const canCreateTicketFromIssueReport = computed(() =>
    can('create_ticket_from_issue_report', permissionCtx.value),
  )
  const canUpdateTicket = computed(() =>
    can('update_ticket', permissionCtx.value),
  )
  const canTransitionTicket = computed(() =>
    can('transition_ticket', permissionCtx.value),
  )
  const canCreateIssueReport = computed(() =>
    can('create_issue_report', permissionCtx.value),
  )
  const canManageWorkflows = computed(() =>
    can('manage_workflows', permissionCtx.value),
  )

  function canEditIssueReportFor(reportCreatedBy: string | null | undefined): boolean {
    const ctx = permissionCtx.value
    if (!ctx.projectId || !ctx.organizationId) return false
    return canEditIssueReport(
      ctx.projectId,
      ctx.organizationId,
      reportCreatedBy,
      ctx.visibility,
    )
  }

  function canEditTicketField(field: string): boolean {
    if (field === 'workflow_status_id') return canTransitionTicket.value
    return canUpdateTicket.value
  }

  return {
    project,
    organizationId,
    visibility,
    effectiveRole,
    canEditUserStory,
    canCreateUserStory,
    canCreateTicket,
    canCreateTicketFromStory,
    canCreateTicketFromIssueReport,
    canUpdateTicket,
    canTransitionTicket,
    canCreateIssueReport,
    canManageWorkflows,
    canEditIssueReportFor,
    canEditTicketField,
    hasProjectRole: (minRole: ProjectRole) =>
      hasProjectRole(
        permissionCtx.value.projectId,
        permissionCtx.value.organizationId,
        minRole,
        permissionCtx.value.visibility,
      ),
  }
}
