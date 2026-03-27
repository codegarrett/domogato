<script setup lang="ts">
import { inject } from 'vue'
import type { PageTreeNode } from '@/api/kb'

defineProps<{
  nodes: PageTreeNode[]
  depth?: number
}>()

const isExpanded = inject<(id: string) => boolean>('kbTreeIsExpanded', () => false)
const toggleExpand = inject<(id: string) => void>('kbTreeToggleExpand', () => {})
const isActive = inject<(node: PageTreeNode) => boolean>('kbTreeIsActive', () => false)
const selectPage = inject<(node: PageTreeNode) => void>('kbTreeSelectPage', () => {})
</script>

<template>
  <div v-for="node in nodes" :key="node.id" class="kb-tree-item">
    <div
      class="tree-node"
      :class="{ active: isActive(node) }"
      :style="{ paddingLeft: ((depth ?? 0) * 16 + 8) + 'px' }"
      @click="selectPage(node)"
    >
      <i
        v-if="node.children.length"
        :class="isExpanded(node.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
        class="tree-toggle text-xs mr-1"
        @click.stop="toggleExpand(node.id)"
      />
      <i v-else class="pi pi-file text-xs mr-1 text-color-secondary" />
      <span class="text-sm tree-label">{{ node.title }}</span>
    </div>
    <div v-if="isExpanded(node.id) && node.children.length">
      <KBTreeItem :nodes="node.children" :depth="(depth ?? 0) + 1" />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 0.5rem;
  user-select: none;
}

.tree-node:hover {
  background: var(--app-hover-bg);
}

.tree-node.active {
  background: var(--p-primary-50, #eef2ff);
  color: var(--p-primary-color, #6366f1);
  font-weight: 600;
}

.tree-toggle {
  cursor: pointer;
  flex-shrink: 0;
}

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
