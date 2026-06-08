<template>
  <div v-if="interaction" class="chat-pending-action">
    <div class="chat-pending-action-body">
      <i class="pi pi-exclamation-circle" />
      <div class="chat-pending-action-text">
        <span class="chat-pending-action-label">{{ label }}</span>
        <span class="chat-pending-action-detail">{{ detail }}</span>
      </div>
    </div>
    <div v-if="interaction.type === 'approval'" class="chat-pending-action-buttons">
      <button
        class="chat-pending-action-btn chat-pending-action-btn--approve"
        :disabled="disabled"
        @click="$emit('approve')"
      >
        {{ $t('ai.approve') }}
      </button>
      <button
        class="chat-pending-action-btn chat-pending-action-btn--reject"
        :disabled="disabled"
        @click="$emit('reject')"
      >
        {{ $t('ai.reject') }}
      </button>
    </div>
    <div v-else class="chat-pending-action-options">
      <button
        v-for="(option, idx) in interaction.options"
        :key="idx"
        class="chat-pending-action-btn"
        :disabled="disabled"
        @click="$emit('select', option)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApprovalInteraction, ChoiceInteraction } from '@/api/ai'

const props = defineProps<{
  interaction: ApprovalInteraction | ChoiceInteraction
  disabled?: boolean
}>()

defineEmits<{
  approve: []
  reject: []
  select: [option: string]
}>()

const { t } = useI18n()

const label = computed(() => {
  if (props.interaction.type === 'approval') {
    return t('ai.pendingApprovalBanner')
  }
  return t('ai.pendingChoiceBanner')
})

const detail = computed(() => {
  if (props.interaction.type === 'approval') {
    return props.interaction.action
  }
  return props.interaction.question
})
</script>

<style scoped>
.chat-pending-action {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
  border-top: 1px solid var(--p-warning-200, #fde68a);
  background: color-mix(in srgb, var(--p-warning-color, #e6a817) 10%, transparent);
}

.chat-pending-action-body {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.chat-pending-action-body i {
  color: var(--p-warning-color, #e6a817);
  margin-top: 0.125rem;
}

.chat-pending-action-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.chat-pending-action-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-warning-color, #e6a817);
}

.chat-pending-action-detail {
  font-size: 0.8125rem;
  color: var(--p-text-color);
}

.chat-pending-action-buttons,
.chat-pending-action-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chat-pending-action-btn {
  padding: 0.4375rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--app-border-color, var(--p-content-border-color));
  background: var(--p-content-background);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
}

.chat-pending-action-btn--approve {
  background: var(--p-green-500, #22c55e);
  color: #fff;
  border-color: var(--p-green-500, #22c55e);
}

.chat-pending-action-btn--reject {
  color: var(--p-text-muted-color);
}
</style>
