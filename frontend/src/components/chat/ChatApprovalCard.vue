<template>
  <div
    class="chat-approval-card"
    :class="{
      'chat-approval-card--approved': interaction.status === 'approved',
      'chat-approval-card--rejected': interaction.status === 'rejected',
    }"
  >
    <div class="chat-approval-card-header">
      <i :class="headerIcon" />
      <span>{{ headerLabel }}</span>
    </div>
    <div class="chat-approval-card-action">
      {{ interaction.action }}
    </div>
    <div
      v-if="interaction.details && Object.keys(interaction.details).length"
      class="chat-approval-card-details"
    >
      <div
        v-for="(val, key) in interaction.details"
        :key="String(key)"
        class="chat-approval-card-detail-row"
      >
        <span class="chat-approval-card-detail-key">{{ formatDetailKey(String(key)) }}</span>
        <span class="chat-approval-card-detail-value">{{ val }}</span>
      </div>
    </div>
    <div v-if="interaction.status !== 'pending' && interaction.decided_at" class="chat-approval-card-decision">
      {{ decisionLabel }}
    </div>
    <div v-if="interaction.status === 'pending' && !disabled" class="chat-approval-card-actions">
      <button
        class="chat-approval-btn chat-approval-btn--approve"
        @click="$emit('approve')"
      >
        <i class="pi pi-check" />
        {{ $t('ai.approve') }}
      </button>
      <button
        class="chat-approval-btn chat-approval-btn--reject"
        @click="$emit('reject')"
      >
        <i class="pi pi-times" />
        {{ $t('ai.reject') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApprovalInteraction } from '@/api/ai'

const props = defineProps<{
  interaction: ApprovalInteraction
  disabled?: boolean
}>()

defineEmits<{
  approve: []
  reject: []
}>()

const { t, locale } = useI18n()

function formatDetailKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDecisionTime(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const headerIcon = computed(() => {
  if (props.interaction.status === 'approved') return 'pi pi-check-circle'
  if (props.interaction.status === 'rejected') return 'pi pi-times-circle'
  return 'pi pi-shield'
})

const headerLabel = computed(() => {
  if (props.interaction.status === 'approved') return t('ai.approvalApproved')
  if (props.interaction.status === 'rejected') return t('ai.approvalRejected')
  return t('ai.approvalRequired')
})

const decisionLabel = computed(() => {
  if (!props.interaction.decided_at) return ''
  const time = formatDecisionTime(props.interaction.decided_at)
  if (props.interaction.status === 'approved') {
    return t('ai.approvalDecidedAt', { time, decision: t('ai.approve').toLowerCase() })
  }
  return t('ai.approvalDecidedAt', { time, decision: t('ai.reject').toLowerCase() })
})
</script>

<style scoped>
.chat-approval-card {
  margin: 0.5rem 0;
  border-radius: 0.5rem;
  border: 1px solid var(--app-border-color, var(--p-content-border-color));
  background: var(--p-content-background);
  overflow: hidden;
}

.chat-approval-card--approved {
  border-color: var(--p-green-200, #bbf7d0);
}

.chat-approval-card--rejected {
  border-color: var(--p-red-200, #fecaca);
}

.chat-approval-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-warning-color, #e6a817);
  background: color-mix(in srgb, var(--p-warning-color, #e6a817) 8%, transparent);
}

.chat-approval-card--approved .chat-approval-card-header {
  color: var(--p-green-600, #16a34a);
  background: color-mix(in srgb, var(--p-green-500, #22c55e) 8%, transparent);
}

.chat-approval-card--rejected .chat-approval-card-header {
  color: var(--p-red-600, #dc2626);
  background: color-mix(in srgb, var(--p-red-500, #ef4444) 8%, transparent);
}

.chat-approval-card-header i {
  font-size: 0.875rem;
}

.chat-approval-card-action {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.chat-approval-card-details {
  padding: 0 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-approval-card-detail-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.chat-approval-card-detail-key {
  color: var(--p-text-muted-color);
  min-width: 5rem;
  flex-shrink: 0;
}

.chat-approval-card-detail-value {
  color: var(--p-text-color);
  word-break: break-word;
}

.chat-approval-card-decision {
  padding: 0 0.75rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.chat-approval-card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--app-border-color, var(--p-content-border-color));
}

.chat-approval-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--app-border-color, var(--p-content-border-color));
  background: var(--p-content-background);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s;
  flex: 1;
  justify-content: center;
}

.chat-approval-btn--approve {
  background: var(--p-green-500, #22c55e);
  color: #fff;
  border-color: var(--p-green-500, #22c55e);
}

.chat-approval-btn--approve:hover {
  background: var(--p-green-600, #16a34a);
  border-color: var(--p-green-600, #16a34a);
}

.chat-approval-btn--reject {
  background: transparent;
  color: var(--p-text-muted-color);
  border-color: var(--app-border-color, var(--p-content-border-color));
}

.chat-approval-btn--reject:hover {
  background: color-mix(in srgb, var(--p-red-500, #ef4444) 12%, transparent);
  color: var(--p-red-500, #ef4444);
  border-color: var(--p-red-500, #ef4444);
}
</style>
