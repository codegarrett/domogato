<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

defineProps<{
  count: number
  loading?: boolean
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  confirm: []
}>()

const confirmText = ref('')

watch(visible, (open) => {
  if (!open) confirmText.value = ''
})

function submit() {
  if (confirmText.value !== 'delete') return
  emit('confirm')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('tickets.deleteConfirmTitle')"
    modal
    :style="{ width: '28rem', maxWidth: '95vw' }"
    :closable="!loading"
    @hide="confirmText = ''"
  >
    <p class="text-sm text-color-secondary mt-0 mb-3">
      {{ $t('tickets.deleteConfirmMessage', { count }) }}
    </p>
    <label class="block text-sm font-semibold mb-2">{{ $t('tickets.deleteConfirmType') }}</label>
    <InputText
      v-model="confirmText"
      class="w-full"
      :placeholder="$t('tickets.deleteConfirmPlaceholder')"
      autocomplete="off"
      :disabled="loading"
      @keyup.enter="submit"
    />
    <template #footer>
      <Button
        :label="$t('common.cancel')"
        severity="secondary"
        text
        :disabled="loading"
        @click="visible = false"
      />
      <Button
        :label="$t('tickets.deleteSelected', { n: count })"
        icon="pi pi-trash"
        severity="danger"
        :loading="loading"
        :disabled="confirmText !== 'delete' || count === 0"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
