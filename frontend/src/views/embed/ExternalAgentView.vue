<template>
  <div class="external-agent-view">
    <div v-if="loading" class="external-agent-loading">
      <i class="pi pi-spin pi-spinner" />
    </div>

    <div v-else-if="!enabled" class="external-agent-disabled">
      <i class="pi pi-ban" />
      <h2>{{ $t('embed.disabledTitle') }}</h2>
      <p>{{ $t('embed.disabled') }}</p>
    </div>

    <div v-else-if="!chatStore.isConfigured" class="external-agent-disabled">
      <i class="pi pi-exclamation-circle" />
      <h2>{{ $t('ai.errorNotConfigured') }}</h2>
    </div>

    <div v-else-if="sessionExpired" class="external-agent-disabled">
      <i class="pi pi-clock" />
      <h2>{{ $t('embed.sessionExpired') }}</h2>
      <Button :label="$t('embed.signInAgain')" @click="reauth" />
    </div>

    <ChatPanel v-else embedded />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { redirectToEmbedLogin, setEmbedMode } from '@/utils/embedMode'
import { syncSessionCookie } from '@/utils/sessionCookie'

const authStore = useAuthStore()
const chatStore = useChatStore()

const loading = ref(true)
const enabled = ref(false)
const sessionExpired = ref(false)

onMounted(async () => {
  setEmbedMode()
  try {
    if (!authStore.authConfig) {
      await authStore.fetchAuthConfig()
    }
    enabled.value = authStore.authConfig?.external_agent_enabled ?? false

    if (!enabled.value) {
      return
    }

    if (!authStore.isAuthenticated) {
      await authStore.initAuth()
    }

    if (!authStore.isAuthenticated) {
      redirectToEmbedLogin('/embed/agent')
      return
    }

    await syncSessionCookie()
    await chatStore.loadConfig()
    chatStore.isOpen = true
    chatStore.view = 'chat'
    if (chatStore.messages.length === 0 && !chatStore.activeConversationId) {
      chatStore.newConversation()
    }
  } catch {
    sessionExpired.value = true
  } finally {
    loading.value = false
  }
})

function reauth() {
  redirectToEmbedLogin('/embed/agent')
}
</script>

<style scoped>
.external-agent-view {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--p-surface-ground, var(--p-surface-50));
}

.external-agent-loading,
.external-agent-disabled {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.external-agent-disabled i {
  font-size: 2rem;
}

.external-agent-disabled h2 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--p-text-color);
}
</style>
