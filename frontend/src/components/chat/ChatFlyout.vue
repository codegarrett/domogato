<template>
  <Drawer
    v-model:visible="chatStore.isOpen"
    position="right"
    class="chat-flyout"
    :style="{ width: '420px' }"
    :modal="false"
    :dismissable="!chatStore.debugLogOpen"
    :show-close-icon="true"
  >
    <ChatPanel />
  </Drawer>
</template>

<script setup lang="ts">
import Drawer from 'primevue/drawer'
import { useChatStore } from '@/stores/chat'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const chatStore = useChatStore()
</script>

<style scoped>
.chat-flyout :deep(.p-drawer-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
