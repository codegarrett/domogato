<template>
  <Drawer
    v-model:visible="chatStore.isOpen"
    position="right"
    class="chat-flyout"
    :style="{ width: '420px' }"
    :modal="false"
    :dismissable="!chatStore.debugLogOpen"
    :show-close-icon="true"
    :aria-label="$t('ai.assistant')"
    @hide="onAfterHide"
  >
    <ChatPanel />
  </Drawer>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import Drawer from 'primevue/drawer'
import { useChatStore } from '@/stores/chat'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const chatStore = useChatStore()
const lastFocusTarget = ref<HTMLElement | null>(null)

watch(
  () => chatStore.isOpen,
  (open) => {
    if (open) {
      lastFocusTarget.value = document.activeElement as HTMLElement | null
    }
  },
)

function onAfterHide() {
  lastFocusTarget.value?.focus?.()
  lastFocusTarget.value = null
}
</script>

<style scoped>
.chat-flyout :deep(.p-drawer-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
