<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getProject } from '@/api/projects'

const route = useRoute()
const { t } = useI18n()

const projectId = computed(() => (route.params.projectId as string) || null)
const projectName = ref<string | null>(null)
const projectKey = ref<string | null>(null)

watchEffect(async () => {
  const pid = projectId.value
  if (!pid) {
    projectName.value = null
    projectKey.value = null
    return
  }
  try {
    const p = await getProject(pid)
    projectName.value = p.name
    projectKey.value = p.key
  } catch {
    projectName.value = null
    projectKey.value = null
  }
})

const sections = computed(() => {
  const pid = projectId.value
  if (!pid) return []
  return [
    { key: 'overview',      label: t('nav.overview'),      to: `/projects/${pid}`,               icon: 'pi pi-home' },
    { key: 'tickets',       label: t('nav.ticketsList'),    to: `/projects/${pid}/tickets`,       icon: 'pi pi-list' },
    { key: 'board',         label: t('nav.board'),          to: `/projects/${pid}/board`,         icon: 'pi pi-th-large' },
    { key: 'backlog',       label: t('nav.backlog'),        to: `/projects/${pid}/backlog`,       icon: 'pi pi-inbox' },
    { key: 'sprints',       label: t('nav.sprints'),        to: `/projects/${pid}/sprints`,       icon: 'pi pi-calendar' },
    { key: 'timeline',       label: t('timeline.title'),      to: `/projects/${pid}/timeline`,       icon: 'pi pi-calendar-clock' },
    { key: 'reports',        label: t('reports.title'),       to: `/projects/${pid}/reports`,        icon: 'pi pi-chart-bar' },
    { key: 'custom-fields', label: t('nav.customFields'),   to: `/projects/${pid}/custom-fields`, icon: 'pi pi-sliders-h' },
    { key: 'audit-log',    label: t('audit.title'),          to: `/projects/${pid}/audit-log`,     icon: 'pi pi-history' },
    { key: 'webhooks',      label: t('webhooks.title'),     to: `/projects/${pid}/webhooks`,      icon: 'pi pi-link' },
    { key: 'kb',             label: t('kb.title'),           to: `/projects/${pid}/kb`,            icon: 'pi pi-book' },
    { key: 'settings',       label: t('nav.projectSettings'), to: `/projects/${pid}/settings`,    icon: 'pi pi-cog' },
  ]
})

function isActive(section: { key: string; to: string }): boolean {
  const path = route.path
  if (section.key === 'overview') {
    return path === section.to
  }
  return path.startsWith(section.to)
}
</script>

<template>
  <div v-if="projectId" class="project-subnav">
    <div class="subnav-header">
      <router-link :to="`/projects/${projectId}`" class="project-link">
        <span v-if="projectKey" class="project-key">{{ projectKey }}</span>
        <span v-if="projectName" class="project-name">{{ projectName }}</span>
      </router-link>
    </div>
    <nav class="subnav-tabs">
      <router-link
        v-for="s in sections"
        :key="s.key"
        :to="s.to"
        class="subnav-tab"
        :class="{ active: isActive(s) }"
      >
        <i :class="s.icon" />
        <span>{{ s.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.project-subnav {
  background: var(--p-content-background);
  border-bottom: 1px solid var(--p-surface-100, #e2e8f0);
  padding: 0 1.5rem;
  margin: -1.5rem -1.5rem 1.5rem -1.5rem;
}

.subnav-header {
  padding: 0.625rem 0 0;
}

.project-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--p-text-color);
}

.project-key {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--p-primary-100, #e0e7ff);
  color: var(--p-primary-700, #4338ca);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.project-name {
  font-size: 0.9375rem;
  font-weight: 600;
}

.subnav-tabs {
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.subnav-tabs::-webkit-scrollbar {
  display: none;
}

.subnav-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-muted-color, #64748b);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.subnav-tab i {
  font-size: 0.875rem;
}

.subnav-tab:hover {
  color: var(--p-text-color);
}

.subnav-tab.active {
  color: var(--p-primary-color, #6366f1);
  border-bottom-color: var(--p-primary-color, #6366f1);
  font-weight: 600;
}
</style>
