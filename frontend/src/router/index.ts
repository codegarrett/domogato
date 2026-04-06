import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
        },
        {
          path: 'callback',
          name: 'auth-callback',
          component: () => import('@/views/auth/CallbackView.vue'),
        },
      ],
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/setup/SetupWizardView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
        },
        {
          path: 'organizations',
          name: 'organizations',
          component: () => import('@/views/organizations/OrgListView.vue'),
        },
        {
          path: 'organizations/:orgId',
          name: 'org-detail',
          component: () => import('@/views/organizations/OrgDetailView.vue'),
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/projects/ProjectListView.vue'),
        },
        {
          path: 'projects/:projectId',
          name: 'project-detail',
          component: () => import('@/views/projects/ProjectDetailView.vue'),
        },
        {
          path: 'projects/:projectId/custom-fields',
          name: 'custom-fields',
          component: () => import('@/views/projects/CustomFieldsView.vue'),
        },
        {
          path: 'projects/:projectId/board',
          name: 'board',
          component: () => import('@/views/boards/BoardView.vue'),
        },
        {
          path: 'projects/:projectId/sprints',
          name: 'sprint-list',
          component: () => import('@/views/sprints/SprintListView.vue'),
        },
        {
          path: 'projects/:projectId/backlog',
          name: 'backlog',
          component: () => import('@/views/sprints/BacklogView.vue'),
        },
        {
          path: 'projects/:projectId/issue-reports',
          name: 'issue-report-queue',
          component: () => import('@/views/issue-reports/IssueReportQueueView.vue'),
        },
        {
          path: 'projects/:projectId/issue-reports/:reportId',
          name: 'issue-report-detail',
          component: () => import('@/views/issue-reports/IssueReportDetailView.vue'),
        },
        {
          path: 'projects/:projectId/tickets',
          name: 'ticket-list',
          component: () => import('@/views/tickets/TicketListView.vue'),
        },
        {
          path: 'projects/:projectId/import',
          name: 'import-tickets',
          component: () => import('@/views/tickets/ImportTicketsView.vue'),
        },
        {
          path: 'tickets/:ticketId',
          name: 'ticket-detail',
          component: () => import('@/views/tickets/TicketDetailView.vue'),
        },
        {
          path: 'projects/:projectId/timeline',
          name: 'timeline',
          component: () => import('@/views/timeline/TimelineView.vue'),
        },
        {
          path: 'projects/:projectId/reports',
          name: 'reports',
          component: () => import('@/views/reports/ReportsView.vue'),
        },
        {
          path: 'projects/:projectId/sprints/:sprintId/report',
          name: 'sprint-report',
          component: () => import('@/views/reports/SprintReportView.vue'),
        },
        {
          path: 'projects/:projectId/audit-log',
          name: 'audit-log',
          component: () => import('@/views/settings/AuditLogView.vue'),
        },
        {
          path: 'projects/:projectId/settings',
          name: 'project-settings',
          component: () => import('@/views/projects/ProjectSettingsView.vue'),
        },
        {
          path: 'projects/:projectId/webhooks',
          name: 'webhook-settings',
          component: () => import('@/views/settings/WebhookSettingsView.vue'),
        },
        {
          path: 'projects/:projectId/kb/story-workflow',
          name: 'story-workflow-settings',
          component: () => import('@/views/kb/StoryWorkflowSettingsView.vue'),
        },
        {
          path: 'projects/:projectId/kb',
          name: 'kb-spaces',
          component: () => import('@/views/kb/KBSpaceListView.vue'),
        },
        {
          path: 'projects/:projectId/kb/:spaceSlug',
          name: 'kb-space',
          component: () => import('@/views/kb/KBPageView.vue'),
        },
        {
          path: 'projects/:projectId/kb/:spaceSlug/:pageSlug',
          name: 'kb-page',
          component: () => import('@/views/kb/KBPageView.vue'),
        },
        {
          path: 'workflows',
          name: 'workflows',
          component: () => import('@/views/settings/WorkflowSettingsView.vue'),
        },
        {
          path: 'workflows/:workflowId',
          name: 'workflow-detail',
          component: () => import('@/views/settings/WorkflowDetailView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/UserProfileView.vue'),
        },
        {
          path: 'settings',
          name: 'app-settings',
          component: () => import('@/views/settings/AppSettingsView.vue'),
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
        },
        {
          path: 'admin/organizations',
          name: 'admin-orgs',
          component: () => import('@/views/admin/AdminOrgsView.vue'),
        },
        {
          path: 'admin/auth',
          name: 'admin-auth',
          component: () => import('@/views/admin/AdminAuthView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(authGuard)

export default router
