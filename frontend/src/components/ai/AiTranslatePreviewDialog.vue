<template>
  <Dialog
    :visible="visible"
    :header="t('contentAssist.aiTranslateTitle')"
    modal
    :style="{ width: '40rem', maxWidth: '95vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <p v-if="fromCache" class="text-sm text-color-secondary mt-0 mb-3">
      {{ t('contentAssist.aiTranslateCached') }}
    </p>
    <div class="flex flex-column gap-3">
      <div>
        <label class="block text-sm font-semibold mb-1">{{ t('contentAssist.aiTranslateSource') }}</label>
        <div class="surface-ground border-round p-3 text-sm whitespace-pre-wrap max-h-12rem overflow-auto">
          {{ sourceText }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold mb-1">{{ t('contentAssist.aiTranslateResult') }}</label>
        <div class="surface-ground border-round p-3 text-sm whitespace-pre-wrap max-h-12rem overflow-auto">
          {{ translatedText }}
        </div>
      </div>
    </div>
    <Message v-if="error" severity="error" :closable="false" class="mt-3">
      {{ error }}
    </Message>
    <template #footer>
      <Button :label="t('common.cancel')" text @click="$emit('update:visible', false)" />
      <Button
        :label="applyLabel || t('contentAssist.aiTranslateApply')"
        icon="pi pi-check"
        :disabled="!translatedText"
        @click="$emit('apply')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'

defineProps<{
  visible: boolean
  sourceText: string
  translatedText: string
  fromCache?: boolean
  error?: string | null
  applyLabel?: string
}>()

defineEmits<{
  'update:visible': [value: boolean]
  apply: []
}>()

const { t } = useI18n()
</script>
