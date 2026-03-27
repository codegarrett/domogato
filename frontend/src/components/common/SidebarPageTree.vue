<script setup lang="ts">
import type { PageTreeNode } from '@/api/kb'
import { useRoute } from 'vue-router'

const props = defineProps<{
  nodes: PageTreeNode[]
  projectId: string
  spaceSlug: string
  expandedPages: Set<string>
}>()

const emit = defineEmits<{
  (e: 'toggle-page', pageId: string): void
}>()

const route = useRoute()

function isPageActive(slug: string): boolean {
  return route.params.pageSlug === slug && route.params.spaceSlug === props.spaceSlug
}
</script>

<template>
  <ul class="sidebar-page-tree">
    <li v-for="node in nodes" :key="node.id" class="tree-node">
      <div class="tree-node-row" :class="{ active: isPageActive(node.slug) }">
        <button
          v-if="node.children?.length"
          class="tree-toggle"
          @click.stop="emit('toggle-page', node.id)"
        >
          <i
            class="pi"
            :class="expandedPages.has(node.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
          />
        </button>
        <span v-else class="tree-toggle-spacer" />
        <router-link
          :to="`/projects/${projectId}/kb/${spaceSlug}/${node.slug}`"
          class="tree-label"
        >
          <i class="pi pi-file" />
          <span class="tree-text-ellipsis">{{ node.title }}</span>
        </router-link>
      </div>
      <ul v-if="node.children?.length && expandedPages.has(node.id)" class="tree-children">
        <SidebarPageTree
          :nodes="node.children"
          :project-id="projectId"
          :space-slug="spaceSlug"
          :expanded-pages="expandedPages"
          @toggle-page="emit('toggle-page', $event)"
        />
      </ul>
    </li>
  </ul>
</template>

<style scoped>
.sidebar-page-tree {
  list-style: none;
  padding: 0;
  margin: 0;
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
  padding: 0.25rem 0.5rem;
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
</style>
