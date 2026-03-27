<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="app-header-left">
        <Button icon="pi pi-bars" text @click="sidebarVisible = !sidebarVisible" />
        <span class="app-title">{{ $t('nav.appName') }}</span>
        <OrgSwitcher />
      </div>
      <div class="app-header-right">
        <Select
          v-model="currentLocale"
          :options="localeOptions"
          option-label="label"
          option-value="value"
          class="locale-select"
          :aria-label="$t('nav.language')"
        />
        <NotificationBell />
        <Button
          v-if="chatStore.isConfigured"
          icon="pi pi-comment"
          text
          :aria-label="$t('ai.assistant')"
          @click="chatStore.toggle()"
        />
        <span v-if="authStore.currentUser" class="user-name">
          {{ authStore.currentUser.display_name }}
        </span>
        <Avatar
          :label="authStore.currentUser?.display_name?.charAt(0)?.toUpperCase() ?? '?'"
          shape="circle"
          class="header-avatar"
          @click="menuRef.toggle($event)"
        />
        <Menu ref="menuRef" :model="userMenuItems" :popup="true" />
      </div>
    </header>

    <div class="app-body">
      <aside
        v-if="sidebarVisible"
        class="app-sidebar"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <nav class="sidebar-inner">
          <p class="sidebar-section-label">{{ $t('nav.menu') }}</p>
          <ul class="sidebar-nav">
            <li>
              <router-link to="/" class="nav-item" exact-active-class="active">
                <i class="pi pi-home" />
                {{ $t('nav.dashboard') }}
              </router-link>
            </li>
          </ul>

          <p class="sidebar-section-label mt-3">{{ $t('nav.organizations') }}</p>
          <div v-if="orgStore.loading" class="sidebar-loading">
            <i class="pi pi-spin pi-spinner text-xs" />
          </div>
          <ul v-else class="sidebar-nav sidebar-tree">
            <li v-for="org in orgStore.organizations" :key="org.id" class="tree-node">
              <!-- Org row -->
              <div class="tree-node-row" :class="{ active: isOrgActive(org.id) }">
                <button
                  class="tree-toggle"
                  @click="toggleOrg(org.id)"
                >
                  <i class="pi" :class="expandedOrgs.has(org.id) ? 'pi-chevron-down' : 'pi-chevron-right'" />
                </button>
                <span class="tree-label tree-label-toggle" @click="toggleOrg(org.id)">
                  <i class="pi pi-building" />
                  {{ org.name }}
                </span>
              </div>

              <!-- Projects under org -->
              <ul v-if="expandedOrgs.has(org.id)" class="tree-children">
                <li v-if="orgProjectsLoading.has(org.id)" class="tree-loading">
                  <i class="pi pi-spin pi-spinner text-xs" />
                </li>
                <template v-else>
                  <li
                    v-for="proj in orgProjects.get(org.id) ?? []"
                    :key="proj.id"
                    class="tree-node"
                  >
                    <!-- Project row (expandable) -->
                    <div
                      class="tree-node-row"
                      :class="{ active: isProjectActive(proj.id) && !expandedProjects.has(proj.id) }"
                    >
                      <button
                        class="tree-toggle"
                        @click="toggleProject(proj.id)"
                      >
                        <i class="pi" :class="expandedProjects.has(proj.id) ? 'pi-chevron-down' : 'pi-chevron-right'" />
                      </button>
                      <span class="tree-label tree-label-toggle" @click="toggleProject(proj.id)">
                        <i class="pi pi-folder" />
                        <span class="tree-project-name">{{ proj.name }}</span>
                        <span class="tree-project-key">{{ proj.key }}</span>
                      </span>
                    </div>

                    <!-- Project categories -->
                    <ul v-if="expandedProjects.has(proj.id)" class="tree-children">
                      <li
                        v-for="cat in getProjectCategories(proj.id)"
                        :key="cat.key"
                        class="tree-node"
                      >
                        <!-- KB category (special: spaces & pages) -->
                        <template v-if="cat.type === 'kb'">
                          <div
                            class="tree-node-row"
                            :class="{ active: isCategoryActive(proj.id, cat) && !expandedKb.has(proj.id) }"
                            @contextmenu.prevent="onKbContextMenu($event, proj.id)"
                          >
                            <button
                              class="tree-toggle"
                              @click="toggleKb(proj.id)"
                            >
                              <i class="pi" :class="expandedKb.has(proj.id) ? 'pi-chevron-down' : 'pi-chevron-right'" />
                            </button>
                            <span class="tree-label tree-label-toggle tree-category-label" @click="toggleKb(proj.id)">
                              <i :class="cat.icon" />
                              <span class="tree-text-ellipsis">{{ cat.label }}</span>
                            </span>
                          </div>

                          <ul v-if="expandedKb.has(proj.id)" class="tree-children">
                            <!-- KB Overview link -->
                            <li class="tree-node">
                              <router-link
                                :to="`/projects/${proj.id}/kb`"
                                class="tree-node-row tree-label leaf"
                                :class="{ active: route.path === `/projects/${proj.id}/kb` }"
                              >
                                <i class="pi pi-home" />
                                <span class="tree-text-ellipsis">{{ $t('nav.overview') }}</span>
                              </router-link>
                            </li>
                            <li v-if="kbSpacesLoading.has(proj.id)" class="tree-loading">
                              <i class="pi pi-spin pi-spinner text-xs" />
                            </li>
                            <template v-else>
                              <li
                                v-for="space in kbSpaces.get(proj.id) ?? []"
                                :key="space.id"
                                class="tree-node"
                                @contextmenu.prevent="onSpaceContextMenu($event, proj.id, space)"
                              >
                                <div class="tree-node-row" :class="{ active: isSpaceActive(space.slug) }">
                                  <button
                                    class="tree-toggle"
                                    @click="toggleSpace(proj.id, space)"
                                  >
                                    <i class="pi" :class="expandedSpaces.has(space.id) ? 'pi-chevron-down' : 'pi-chevron-right'" />
                                  </button>
                                  <router-link
                                    :to="`/projects/${proj.id}/kb/${space.slug}`"
                                    class="tree-label"
                                  >
                                    <i class="pi pi-folder-open" />
                                    <span class="tree-text-ellipsis">{{ space.name }}</span>
                                  </router-link>
                                </div>

                                <ul v-if="expandedSpaces.has(space.id)" class="tree-children">
                                  <li v-if="spacePagesLoading.has(space.id)" class="tree-loading">
                                    <i class="pi pi-spin pi-spinner text-xs" />
                                  </li>
                                  <SidebarPageTree
                                    v-else-if="spacePageTree.get(space.id)?.length"
                                    :nodes="spacePageTree.get(space.id)!"
                                    :project-id="proj.id"
                                    :space-slug="space.slug"
                                    :expanded-pages="expandedPages"
                                    @toggle-page="togglePage"
                                  />
                                  <li
                                    v-else-if="!spacePagesLoading.has(space.id)"
                                    class="tree-empty"
                                  >
                                    {{ $t('common.noResults') }}
                                  </li>
                                  <!-- + New Page inside space -->
                                  <li class="tree-node">
                                    <button
                                      class="tree-action-btn"
                                      @click="sidebarNewPage(proj.id, space.slug)"
                                    >
                                      <i class="pi pi-plus" />
                                      <span>{{ $t('kb.newPage') }}</span>
                                    </button>
                                  </li>
                                </ul>
                              </li>

                              <!-- + New Space at bottom of KB section -->
                              <li class="tree-node">
                                <button
                                  class="tree-action-btn"
                                  @click="openNewSpaceDialog(proj.id)"
                                >
                                  <i class="pi pi-plus" />
                                  <span>{{ $t('kb.newSpace') }}</span>
                                </button>
                              </li>
                            </template>
                          </ul>
                        </template>

                        <!-- Group category (expandable with leaf children) -->
                        <template v-else>
                          <div
                            class="tree-node-row"
                            :class="{ active: isCategoryActive(proj.id, cat) && !expandedCategories.has(categoryKey(proj.id, cat.key)) }"
                          >
                            <button
                              class="tree-toggle"
                              @click="toggleCategory(proj.id, cat)"
                            >
                              <i class="pi" :class="expandedCategories.has(categoryKey(proj.id, cat.key)) ? 'pi-chevron-down' : 'pi-chevron-right'" />
                            </button>
                            <span class="tree-label tree-label-toggle tree-category-label" @click="toggleCategory(proj.id, cat)">
                              <i :class="cat.icon" />
                              <span class="tree-text-ellipsis">{{ cat.label }}</span>
                            </span>
                          </div>

                          <ul v-if="expandedCategories.has(categoryKey(proj.id, cat.key))" class="tree-children">
                            <li
                              v-for="section in cat.children"
                              :key="section.key"
                              class="tree-node"
                            >
                              <router-link
                                :to="section.to"
                                class="tree-node-row tree-label leaf"
                                :class="{ active: isSectionActive(section) }"
                              >
                                <i :class="section.icon" />
                                <span class="tree-text-ellipsis">{{ section.label }}</span>
                              </router-link>
                            </li>
                          </ul>
                        </template>
                      </li>
                    </ul>
                  </li>
                  <li v-if="(orgProjects.get(org.id) ?? []).length === 0" class="tree-empty">
                    {{ $t('common.noResults') }}
                  </li>
                </template>
              </ul>
            </li>
          </ul>

          <p class="sidebar-section-label mt-3">{{ $t('nav.settings') }}</p>
          <ul class="sidebar-nav">
            <li>
              <router-link to="/workflows" class="nav-item">
                <i class="pi pi-sitemap" />
                {{ $t('nav.workflows') }}
              </router-link>
            </li>
          </ul>
        </nav>
        <div
          class="sidebar-resize-handle"
          @pointerdown="onResizeStart"
        />
      </aside>

      <main class="app-main">
        <ProjectSubNav />
        <router-view />
      </main>
    </div>

    <CommandPalette />
    <WsStatusIndicator />
    <ChatFlyout />

    <ContextMenu ref="kbContextMenu" :model="kbContextItems" />

    <Dialog
      v-model:visible="showNewSpaceDialog"
      :header="$t('kb.newSpace')"
      modal
      :style="{ width: '26rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.spaceName') }}</label>
          <InputText v-model="newSpaceName" class="w-full" autofocus />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.spaceDescription') }}</label>
          <Textarea v-model="newSpaceDesc" class="w-full" :rows="3" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('kb.cancel')" severity="secondary" text @click="showNewSpaceDialog = false" />
        <Button
          :label="$t('common.create')"
          icon="pi pi-check"
          :loading="savingSpace"
          :disabled="!newSpaceName.trim()"
          @click="onCreateSpace"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Select from 'primevue/select'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { listProjects, type Project } from '@/api/projects'
import { listSpaces, createSpace, getPageTree, type KBSpace, type PageTreeNode } from '@/api/kb'
import ContextMenu from 'primevue/contextmenu'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import OrgSwitcher from '@/components/common/OrgSwitcher.vue'
import ProjectSubNav from '@/components/common/ProjectSubNav.vue'
import SidebarPageTree from '@/components/common/SidebarPageTree.vue'
import NotificationBell from '@/components/notifications/NotificationBell.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import WsStatusIndicator from '@/components/common/WsStatusIndicator.vue'
import ChatFlyout from '@/components/chat/ChatFlyout.vue'
import { useChatStore } from '@/stores/chat'
import { useWebSocket } from '@/composables/useWebSocket'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { setLocale, getLocale } from '@/i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const chatStore = useChatStore()
const ws = useWebSocket()
useKeyboardShortcuts()

const sidebarVisible = ref(true)
const menuRef = ref()

// ---------------------------------------------------------------------------
// Sidebar resize
// ---------------------------------------------------------------------------
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SIDEBAR_STORAGE_KEY = 'projecthub-sidebar-width'

const sidebarWidth = ref(
  parseInt(localStorage.getItem(SIDEBAR_STORAGE_KEY) || '', 10) || 240,
)

function onResizeStart(e: PointerEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = sidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMove(ev: PointerEvent) {
    const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + ev.clientX - startX))
    sidebarWidth.value = w
  }
  function onUp() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth.value))
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

const localeOptions = [
  { label: 'EN', value: 'en' as const },
  { label: 'ES', value: 'es' as const },
]
const currentLocale = ref<'en' | 'es'>((getLocale() as 'en' | 'es') || 'en')
watch(currentLocale, (value) => setLocale(value))

const userMenuItems = computed(() => {
  const items: any[] = [
    { label: t('nav.profile'), icon: 'pi pi-user', command: () => router.push('/profile') },
    { label: t('nav.settings'), icon: 'pi pi-cog', command: () => router.push('/settings') },
  ]
  if (authStore.isSystemAdmin) {
    items.push({ label: t('nav.admin'), icon: 'pi pi-shield', command: () => router.push('/admin/users') })
  }
  items.push({ separator: true })
  items.push({ label: t('nav.signOut'), icon: 'pi pi-sign-out', command: () => authStore.doLogout() })
  return items
})

// ---------------------------------------------------------------------------
// Org & Project tree (existing)
// ---------------------------------------------------------------------------
const expandedOrgs = reactive(new Set<string>())
const orgProjects = reactive(new Map<string, Project[]>())
const orgProjectsLoading = reactive(new Set<string>())

async function toggleOrg(orgId: string) {
  if (expandedOrgs.has(orgId)) {
    expandedOrgs.delete(orgId)
    return
  }
  expandedOrgs.add(orgId)
  if (!orgProjects.has(orgId)) {
    await loadOrgProjects(orgId)
  }
}

async function loadOrgProjects(orgId: string) {
  orgProjectsLoading.add(orgId)
  try {
    const res = await listProjects(orgId, 0, 200)
    orgProjects.set(orgId, res.items)
  } catch {
    orgProjects.set(orgId, [])
  } finally {
    orgProjectsLoading.delete(orgId)
  }
}

function isOrgActive(orgId: string): boolean {
  return route.path === `/organizations/${orgId}`
}

function isProjectActive(projectId: string): boolean {
  return route.path.startsWith(`/projects/${projectId}`)
}

// ---------------------------------------------------------------------------
// Project sections (grouped into categories)
// ---------------------------------------------------------------------------
const expandedProjects = reactive(new Set<string>())
const expandedCategories = reactive(new Set<string>())

interface SidebarSection {
  key: string
  label: string
  to: string
  icon: string
}

interface SidebarCategory {
  key: string
  label: string
  icon: string
  type: 'group' | 'kb'
  children: SidebarSection[]
}

function getProjectCategories(projectId: string): SidebarCategory[] {
  return [
    {
      key: 'pm',
      label: t('nav.projectManagement'),
      icon: 'pi pi-objects-column',
      type: 'group',
      children: [
        { key: 'overview',      label: t('nav.overview'),    to: `/projects/${projectId}`,               icon: 'pi pi-home' },
        { key: 'tickets',       label: t('nav.ticketsList'), to: `/projects/${projectId}/tickets`,       icon: 'pi pi-list' },
        { key: 'board',         label: t('nav.board'),       to: `/projects/${projectId}/board`,         icon: 'pi pi-th-large' },
        { key: 'backlog',       label: t('nav.backlog'),     to: `/projects/${projectId}/backlog`,       icon: 'pi pi-inbox' },
        { key: 'sprints',       label: t('nav.sprints'),     to: `/projects/${projectId}/sprints`,       icon: 'pi pi-calendar' },
        { key: 'timeline',      label: t('timeline.title'),  to: `/projects/${projectId}/timeline`,      icon: 'pi pi-calendar-clock' },
        { key: 'reports',       label: t('reports.title'),   to: `/projects/${projectId}/reports`,       icon: 'pi pi-chart-bar' },
        { key: 'custom-fields', label: t('nav.customFields'),to: `/projects/${projectId}/custom-fields`, icon: 'pi pi-sliders-h' },
        { key: 'audit-log',     label: t('audit.title'),     to: `/projects/${projectId}/audit-log`,     icon: 'pi pi-history' },
      ],
    },
    {
      key: 'kb',
      label: t('kb.title'),
      icon: 'pi pi-book',
      type: 'kb',
      children: [],
    },
    {
      key: 'integrations',
      label: t('nav.integrations'),
      icon: 'pi pi-link',
      type: 'group',
      children: [
        { key: 'webhooks', label: t('webhooks.title'), to: `/projects/${projectId}/webhooks`, icon: 'pi pi-link' },
      ],
    },
  ]
}

function toggleProject(projectId: string) {
  if (expandedProjects.has(projectId)) {
    expandedProjects.delete(projectId)
  } else {
    expandedProjects.add(projectId)
  }
}

function categoryKey(projectId: string, catKey: string) {
  return `${projectId}:${catKey}`
}

function toggleCategory(projectId: string, cat: SidebarCategory) {
  const ck = categoryKey(projectId, cat.key)
  if (expandedCategories.has(ck)) {
    expandedCategories.delete(ck)
  } else {
    expandedCategories.add(ck)
  }
}

function isCategoryActive(projectId: string, cat: SidebarCategory): boolean {
  if (cat.key === 'kb') return route.path.startsWith(`/projects/${projectId}/kb`)
  return cat.children.some((s) => isSectionActive(s))
}

function isSectionActive(section: SidebarSection): boolean {
  if (section.key === 'overview') return route.path === section.to
  return route.path.startsWith(section.to)
}

// ---------------------------------------------------------------------------
// KB: spaces & page tree (lazy-loaded)
// ---------------------------------------------------------------------------
const expandedKb = reactive(new Set<string>())
const kbSpaces = reactive(new Map<string, KBSpace[]>())
const kbSpacesLoading = reactive(new Set<string>())

const expandedSpaces = reactive(new Set<string>())
const spacePageTree = reactive(new Map<string, PageTreeNode[]>())
const spacePagesLoading = reactive(new Set<string>())

const expandedPages = reactive(new Set<string>())

const kbContextMenu = ref()
const kbContextItems = ref<any[]>([])
const kbContextProjectId = ref('')

const showNewSpaceDialog = ref(false)
const newSpaceName = ref('')
const newSpaceDesc = ref('')
const savingSpace = ref(false)

function onKbContextMenu(e: MouseEvent, projectId: string) {
  kbContextProjectId.value = projectId
  kbContextItems.value = [
    { label: t('kb.newSpace'), icon: 'pi pi-plus', command: () => openNewSpaceDialog(projectId) },
  ]
  kbContextMenu.value.show(e)
}

function onSpaceContextMenu(e: MouseEvent, projectId: string, space: KBSpace) {
  kbContextProjectId.value = projectId
  kbContextItems.value = [
    {
      label: t('kb.newPage'),
      icon: 'pi pi-file-plus',
      command: () => {
        router.push(`/projects/${projectId}/kb/${space.slug}?newpage=1`)
      },
    },
    { label: t('kb.newSpace'), icon: 'pi pi-plus', command: () => openNewSpaceDialog(projectId) },
  ]
  kbContextMenu.value.show(e)
}

function openNewSpaceDialog(projectId: string) {
  kbContextProjectId.value = projectId
  newSpaceName.value = ''
  newSpaceDesc.value = ''
  showNewSpaceDialog.value = true
}

async function onCreateSpace() {
  const name = newSpaceName.value.trim()
  if (!name) return
  savingSpace.value = true
  try {
    const body: { name: string; description?: string } = { name }
    if (newSpaceDesc.value.trim()) body.description = newSpaceDesc.value.trim()
    await createSpace(kbContextProjectId.value, body)
    showNewSpaceDialog.value = false
    kbSpaces.delete(kbContextProjectId.value)
    await loadKbSpaces(kbContextProjectId.value)
  } finally {
    savingSpace.value = false
  }
}

function sidebarNewPage(projectId: string, spaceSlug: string) {
  router.push(`/projects/${projectId}/kb/${spaceSlug}?newpage=1`)
}

async function toggleKb(projectId: string) {
  if (expandedKb.has(projectId)) {
    expandedKb.delete(projectId)
    return
  }
  expandedKb.add(projectId)
  if (!kbSpaces.has(projectId)) {
    await loadKbSpaces(projectId)
  }
}

async function loadKbSpaces(projectId: string) {
  kbSpacesLoading.add(projectId)
  try {
    const spaces = await listSpaces(projectId)
    kbSpaces.set(projectId, spaces.filter((s) => !s.is_archived))
  } catch {
    kbSpaces.set(projectId, [])
  } finally {
    kbSpacesLoading.delete(projectId)
  }
}

async function toggleSpace(_projectId: string, space: KBSpace) {
  if (expandedSpaces.has(space.id)) {
    expandedSpaces.delete(space.id)
    return
  }
  expandedSpaces.add(space.id)
  if (!spacePageTree.has(space.id)) {
    await loadSpacePages(space.id)
  }
}

async function loadSpacePages(spaceId: string) {
  spacePagesLoading.add(spaceId)
  try {
    const tree = await getPageTree(spaceId)
    spacePageTree.set(spaceId, tree)
  } catch {
    spacePageTree.set(spaceId, [])
  } finally {
    spacePagesLoading.delete(spaceId)
  }
}

function togglePage(pageId: string) {
  if (expandedPages.has(pageId)) {
    expandedPages.delete(pageId)
  } else {
    expandedPages.add(pageId)
  }
}

function isSpaceActive(spaceSlug: string): boolean {
  return route.params.spaceSlug === spaceSlug
}

// ---------------------------------------------------------------------------
// Auto-expand sidebar to match current route
// ---------------------------------------------------------------------------
onMounted(async () => {
  chatStore.loadConfig()

  if (authStore.currentUser) {
    ws.connect()
  }

  if (orgStore.organizations.length === 0) {
    await orgStore.fetchOrganizations()
  }

  const projectId = route.params.projectId as string | undefined
  if (projectId) {
    await autoExpandForProject(projectId)
  }
})

onUnmounted(() => {
  ws.disconnect()
})

watch(() => route.params.projectId, async (pid) => {
  if (pid) await autoExpandForProject(pid as string)
})

async function autoExpandForProject(projectId: string) {
  for (const org of orgStore.organizations) {
    const projects = orgProjects.get(org.id)
    if (projects?.some((p) => p.id === projectId)) {
      expandedOrgs.add(org.id)
      expandedProjects.add(projectId)
      autoExpandCategoryForRoute(projectId)
      await autoExpandKbIfNeeded(projectId)
      return
    }
  }
  for (const org of orgStore.organizations) {
    if (!orgProjects.has(org.id)) {
      await loadOrgProjects(org.id)
      const projects = orgProjects.get(org.id)
      if (projects?.some((p) => p.id === projectId)) {
        expandedOrgs.add(org.id)
        expandedProjects.add(projectId)
        autoExpandCategoryForRoute(projectId)
        await autoExpandKbIfNeeded(projectId)
        return
      }
    }
  }
}

function autoExpandCategoryForRoute(projectId: string) {
  const path = route.path
  if (path.includes('/kb')) return // handled separately by autoExpandKbIfNeeded

  const pmPaths = ['/tickets', '/board', '/backlog', '/sprints', '/timeline', '/reports', '/custom-fields', '/audit-log']
  if (pmPaths.some((p) => path.includes(p)) || path === `/projects/${projectId}`) {
    expandedCategories.add(categoryKey(projectId, 'pm'))
  }
  if (path.includes('/webhooks')) {
    expandedCategories.add(categoryKey(projectId, 'integrations'))
  }
}

async function autoExpandKbIfNeeded(projectId: string) {
  if (!route.path.includes('/kb')) return

  expandedKb.add(projectId)
  if (!kbSpaces.has(projectId)) {
    await loadKbSpaces(projectId)
  }

  const spaceSlug = route.params.spaceSlug as string | undefined
  if (!spaceSlug) return

  const spaces = kbSpaces.get(projectId) ?? []
  const space = spaces.find((s) => s.slug === spaceSlug)
  if (!space) return

  expandedSpaces.add(space.id)
  if (!spacePageTree.has(space.id)) {
    await loadSpacePages(space.id)
  }

  const pageSlug = route.params.pageSlug as string | undefined
  if (!pageSlug) return

  const tree = spacePageTree.get(space.id) ?? []
  expandPageAncestors(tree, pageSlug)
}

function expandPageAncestors(nodes: PageTreeNode[], targetSlug: string): boolean {
  for (const node of nodes) {
    if (node.slug === targetSlug) return true
    if (node.children?.length && expandPageAncestors(node.children, targetSlug)) {
      expandedPages.add(node.id)
      return true
    }
  }
  return false
}
</script>

<style scoped>
.app-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: var(--app-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--p-content-background);
  box-shadow: var(--shadow-md);
  flex-shrink: 0;
  z-index: 10;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.locale-select {
  width: 4.25rem;
  min-width: 4.25rem;
}

.locale-select :deep(.p-select-label) {
  padding-block: 0.35rem;
  padding-inline: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-avatar {
  cursor: pointer;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--p-primary-color);
}

.user-name {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-sidebar {
  position: relative;
  background: var(--p-content-background);
  border-right: 1px solid var(--p-content-border-color);
  padding: 0.75rem 0;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 5;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background: var(--p-primary-color);
  opacity: 0.25;
  border-radius: 3px;
}

.sidebar-inner {
  padding: 0 0.5rem;
  user-select: none;
  -webkit-user-select: none;
}

.sidebar-section-label {
  margin: 0 0 0.375rem 0.625rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.mt-3 {
  margin-top: 0.75rem;
}

.sidebar-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.4375rem 0.75rem;
  margin-bottom: 1px;
  border-radius: 6px;
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: background 0.12s, color 0.12s;
}

.nav-item:hover {
  background: var(--app-hover-bg);
}

.nav-item.active,
.nav-item.router-link-exact-active {
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
  color: var(--p-primary-color);
  font-weight: 600;
}

.sidebar-loading {
  padding: 0.5rem 0.75rem;
  color: var(--p-text-muted-color);
}

/* --- Tree --- */
.sidebar-tree {
  margin: 0;
  padding: 0;
}

.tree-node {
  list-style: none;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 6px;
  transition: background 0.12s;
}

.tree-node-row:hover {
  background: var(--app-hover-bg);
}

.tree-node-row.active {
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
}

.tree-node-row.active .tree-label {
  color: var(--p-primary-color);
  font-weight: 600;
}

.tree-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
  padding: 0;
  margin-left: 0.125rem;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
}

.tree-toggle:hover {
  background: var(--app-border-color);
  color: var(--p-text-color);
}

.tree-toggle i {
  font-size: 0.5625rem;
}

.tree-toggle-spacer {
  display: inline-block;
  width: 1.25rem;
  flex-shrink: 0;
  margin-left: 0.125rem;
}

.tree-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  padding: 0.3125rem 0.5rem;
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-label i {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.tree-label-toggle {
  cursor: pointer;
}

.tree-category-label {
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
  color: var(--p-text-muted-color);
}

.tree-text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.tree-children {
  list-style: none;
  padding: 0 0 0 0.375rem;
  margin: 0;
  border-left: 1px solid var(--app-border-color);
  margin-left: 0.6875rem;
}

.tree-children .tree-node-row.leaf,
.tree-children .tree-label.leaf {
  padding: 0.25rem 0.5rem 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.tree-project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.tree-project-key {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  background: var(--app-card-alt-bg);
  padding: 0 0.25rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.tree-loading {
  padding: 0.375rem 0.625rem;
  color: var(--p-text-muted-color);
}

.tree-empty {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  font-style: italic;
}

.tree-action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.25rem 0.5rem;
  margin-top: 1px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
}

.tree-action-btn:hover {
  background: var(--app-hover-bg);
  color: var(--p-primary-color);
}

.tree-action-btn i {
  font-size: 0.625rem;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: var(--p-surface-ground);
}
</style>
