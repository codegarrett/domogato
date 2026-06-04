<template>
  <div
    class="chat-choice-card"
    :class="{ 'chat-choice-card--answered': interaction.status === 'answered' }"
  >
    <div class="chat-choice-card-header">
      <i :class="headerIcon" />
      <span>{{ headerLabel }}</span>
    </div>
    <div class="chat-choice-card-question">
      {{ interaction.question }}
    </div>
    <div v-if="interaction.status === 'answered' && interaction.selected_option" class="chat-choice-card-answer">
      <span class="chat-choice-card-answer-label">{{ $t('ai.choiceAnswered') }}</span>
      <span class="chat-choice-card-answer-value">{{ interaction.selected_option }}</span>
    </div>
    <div v-if="interaction.status === 'answered' && interaction.decided_at" class="chat-choice-card-decision">
      {{ decisionLabel }}
    </div>
    <div v-if="interaction.status === 'pending' && !disabled" class="chat-choice-card-options">
      <button
        v-for="(option, idx) in interaction.options"
        :key="idx"
        class="chat-choice-btn"
        @click="$emit('select', option)"
      >
        {{ option }}
      </button>
      <button
        v-if="showOther"
        class="chat-choice-btn chat-choice-btn--other"
        @click="showOtherInput = true"
      >
        {{ $t('ai.otherOption') }}
      </button>
    </div>
    <div v-if="interaction.status === 'pending' && showOtherInput && !disabled" class="chat-choice-other">
      <input
        v-model="otherInputValue"
        type="text"
        class="chat-choice-other-input"
        :placeholder="$t('ai.typeYourOption')"
        @keydown.enter="submitOther"
      />
      <button
        class="chat-choice-btn chat-choice-btn--submit"
        :disabled="!otherInputValue.trim()"
        @click="submitOther"
      >
        {{ $t('ai.submitOption') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChoiceInteraction } from '@/api/ai'

const props = defineProps<{
  interaction: ChoiceInteraction
  disabled?: boolean
  showOther?: boolean
}>()

const emit = defineEmits<{
  select: [option: string]
}>()

const { t, locale } = useI18n()
const showOtherInput = ref(false)
const otherInputValue = ref('')

function submitOther() {
  const value = otherInputValue.value.trim()
  if (!value) return
  emit('select', value)
  otherInputValue.value = ''
  showOtherInput.value = false
}

function formatDecisionTime(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const headerIcon = computed(() => {
  if (props.interaction.status === 'answered') return 'pi pi-check-circle'
  return 'pi pi-question-circle'
})

const headerLabel = computed(() => {
  if (props.interaction.status === 'answered') return t('ai.choiceAnswered')
  return t('ai.chooseOption')
})

const decisionLabel = computed(() => {
  if (!props.interaction.decided_at) return ''
  const time = formatDecisionTime(props.interaction.decided_at)
  return t('ai.choiceSelectedAt', { time })
})
</script>

<style scoped>
.chat-choice-card {
  margin: 0.5rem 0;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-200));
  background: var(--p-surface-card, #fff);
  overflow: hidden;
}

.chat-choice-card--answered {
  border-color: var(--p-primary-200, #bfdbfe);
}

.chat-choice-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-primary-color, #3b82f6);
  background: color-mix(in srgb, var(--p-primary-color, #3b82f6) 8%, transparent);
}

.chat-choice-card--answered .chat-choice-card-header {
  color: var(--p-green-600, #16a34a);
  background: color-mix(in srgb, var(--p-green-500, #22c55e) 8%, transparent);
}

.chat-choice-card-header i {
  font-size: 0.875rem;
}

.chat-choice-card-question {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.chat-choice-card-answer {
  display: flex;
  gap: 0.5rem;
  padding: 0 0.75rem 0.5rem;
  font-size: 0.8125rem;
}

.chat-choice-card-answer-label {
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.chat-choice-card-answer-value {
  color: var(--p-text-color);
  font-weight: 500;
}

.chat-choice-card-decision {
  padding: 0 0.75rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.chat-choice-card-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--p-surface-border, var(--p-surface-100));
}

.chat-choice-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.4375rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-300));
  background: var(--p-surface-card, #fff);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s;
}

.chat-choice-btn:hover {
  background: var(--p-primary-50, #eff6ff);
  border-color: var(--p-primary-300, #93c5fd);
  color: var(--p-primary-700, #1d4ed8);
}

.chat-choice-btn--other {
  color: var(--p-text-muted-color);
}

.chat-choice-btn--submit {
  background: var(--p-primary-500, #3b82f6);
  color: #fff;
  border-color: var(--p-primary-500, #3b82f6);
}

.chat-choice-btn--submit:hover:not(:disabled) {
  background: var(--p-primary-600, #2563eb);
  border-color: var(--p-primary-600, #2563eb);
  color: #fff;
}

.chat-choice-btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-choice-other {
  display: flex;
  gap: 0.5rem;
  padding: 0 0.75rem 0.625rem;
}

.chat-choice-other-input {
  flex: 1;
  padding: 0.4375rem 0.625rem;
  border-radius: 0.375rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-300));
  font-size: 0.8125rem;
  font-family: inherit;
}
</style>
