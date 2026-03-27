<template>
  <Transition name="ws-status">
    <div v-if="!ws.connected.value" class="ws-status-bar">
      <i class="pi pi-spin pi-spinner text-xs" />
      <span>{{ $t('common.reconnecting') }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useWebSocket } from '@/composables/useWebSocket'

const ws = useWebSocket()
</script>

<style scoped>
.ws-status-bar {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--p-yellow-500, #eab308);
  color: var(--p-surface-0);
  border-radius: 2rem;
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: 0 2px 12px var(--shadow-color);
}

.ws-status-enter-active,
.ws-status-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.ws-status-enter-from,
.ws-status-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(1rem);
}
</style>
