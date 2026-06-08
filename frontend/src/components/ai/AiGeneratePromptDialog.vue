<template>
  <Dialog
    :visible="visible"
    :header="title || t('contentAssist.aiGenerateTitle')"
    modal
    :style="{ width: '32rem' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <p class="text-sm text-color-secondary mt-0 mb-3">
      {{ hint || t('contentAssist.aiGenerateHint') }}
    </p>
    <Textarea
      :model-value="prompt"
      rows="5"
      class="w-full"
      :placeholder="placeholder || t('contentAssist.aiGeneratePrompt')"
      autofocus
      @update:model-value="$emit('update:prompt', $event ?? '')"
    />
    <Message v-if="error" severity="error" :closable="false" class="mt-3">
      {{ error }}
    </Message>
    <template #footer>
      <Button :label="t('common.cancel')" text @click="$emit('update:visible', false)" />
      <Button
        :label="t('contentAssist.aiGenerate')"
        icon="pi pi-sparkles"
        :loading="loading"
        :disabled="!prompt.trim()"
        @click="$emit('generate')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'

defineProps<{
  visible: boolean
  prompt: string
  loading?: boolean
  error?: string | null
  title?: string
  hint?: string
  placeholder?: string
}>()

defineEmits<{
  'update:visible': [value: boolean]
  'update:prompt': [value: string]
  generate: []
}>()

const { t } = useI18n()
</script>
