<template>
  <div class="chat-welcome">
    <div class="chat-welcome-icon">
      <i class="pi pi-sparkles" />
    </div>
    <h2 class="chat-welcome-greeting">{{ greeting }}</h2>
    <p class="chat-welcome-prompt">{{ $t('ai.welcomePrompt') }}</p>
    <p class="chat-welcome-tasks-label">{{ $t('ai.welcomeCommonTasks') }}</p>
    <ul class="chat-welcome-tasks">
      <li v-for="task in tasks" :key="task.key">
        <button
          type="button"
          class="chat-welcome-task"
          :disabled="disabled"
          @click="$emit('select', task.message)"
        >
          <i :class="task.icon" />
          <span>{{ task.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  disabled?: boolean
}>()

defineEmits<{
  select: [message: string]
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const firstName = computed(() => {
  const displayName = authStore.currentUser?.display_name?.trim()
  if (!displayName) return null
  return displayName.split(/\s+/)[0]
})

const greeting = computed(() => {
  const name = firstName.value
  if (name) return t('ai.welcomeGreeting', { name })
  return t('ai.welcomeGreetingAnonymous')
})

const tasks = computed(() => [
  {
    key: 'dashboard',
    icon: 'pi pi-list-check',
    label: t('ai.welcomeTaskDashboard'),
    message: t('ai.welcomeTaskDashboardMessage'),
  },
  {
    key: 'createTicket',
    icon: 'pi pi-plus-circle',
    label: t('ai.welcomeTaskCreateTicket'),
    message: t('ai.welcomeTaskCreateTicketMessage'),
  },
  {
    key: 'reportIssue',
    icon: 'pi pi-exclamation-triangle',
    label: t('ai.welcomeTaskReportIssue'),
    message: t('ai.welcomeTaskReportIssueMessage'),
  },
  {
    key: 'searchKb',
    icon: 'pi pi-book',
    label: t('ai.welcomeTaskSearchKB'),
    message: t('ai.welcomeTaskSearchKBMessage'),
  },
  {
    key: 'listProjects',
    icon: 'pi pi-folder',
    label: t('ai.welcomeTaskListProjects'),
    message: t('ai.welcomeTaskListProjectsMessage'),
  },
])
</script>

<style scoped>
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.25rem 1rem;
  text-align: center;
}

.chat-welcome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.75rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  color: var(--p-primary-color);
  font-size: 1.125rem;
}

.chat-welcome-greeting {
  margin: 0 0 0.375rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.chat-welcome-prompt {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  max-width: 18rem;
}

.chat-welcome-tasks-label {
  margin: 0 0 0.625rem;
  align-self: stretch;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.chat-welcome-tasks {
  list-style: none;
  margin: 0;
  padding: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.chat-welcome-task {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-200));
  background: var(--p-surface-card, #fff);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.chat-welcome-task:hover:not(:disabled) {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 6%, transparent);
}

.chat-welcome-task:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-welcome-task i {
  color: var(--p-primary-color);
  font-size: 0.875rem;
  flex-shrink: 0;
}
</style>
