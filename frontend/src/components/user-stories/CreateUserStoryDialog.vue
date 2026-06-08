<template>
  <Dialog
    :visible="visible"
    modal
    :style="{ width: '32rem', maxWidth: '95vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex align-items-center justify-content-between w-full gap-2 pr-2">
        <span class="font-semibold">{{ $t('userStories.newStory') }}</span>
        <AiSparklesButton :loading="aiGenerating" @click="openAiGenerateDialog" />
      </div>
    </template>
    <div class="flex flex-column gap-3">
      <div>
        <label class="block text-sm font-semibold mb-1">{{ $t('userStories.workingTitle') }} *</label>
        <InputText
          v-model="form.title"
          class="w-full"
          :placeholder="$t('userStories.workingTitlePlaceholder')"
          autofocus
          @keyup.enter="submit"
        />
      </div>
      <div class="flex gap-2 justify-content-end">
        <Button :label="$t('common.cancel')" severity="secondary" text @click="close" />
        <Button
          :label="$t('common.create')"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!form.title.trim()"
          @click="submit"
        />
      </div>
    </div>

    <AiGeneratePromptDialog
      v-model:visible="showAiDialog"
      v-model:prompt="aiPrompt"
      :loading="aiGenerating"
      @generate="onAiGenerate"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createUserStory } from '@/api/user-stories'
import { useContentAssist } from '@/composables/useContentAssist'
import { useToastService } from '@/composables/useToast'
import AiSparklesButton from '@/components/ai/AiSparklesButton.vue'
import AiGeneratePromptDialog from '@/components/ai/AiGeneratePromptDialog.vue'

const props = defineProps<{
  visible: boolean
  projectId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const toast = useToastService()
const { generateContent: runContentGenerate, generating: aiGenerating } = useContentAssist()

const form = ref({ title: '' })
const submitting = ref(false)
const showAiDialog = ref(false)
const aiPrompt = ref('')

watch(() => props.visible, (v) => {
  if (v) form.value = { title: '' }
})

function close() {
  emit('update:visible', false)
}

function openAiGenerateDialog() {
  showAiDialog.value = true
}

async function onAiGenerate() {
  showAiDialog.value = false
  try {
    const result = await runContentGenerate({
      context: 'user_story_create',
      prompt: aiPrompt.value,
      project_id: props.projectId,
    })
    if (result.title) form.value.title = result.title
  } catch {
    toast.showError(t('contentAssist.generateFailed'), '')
  }
}

async function submit() {
  const title = form.value.title.trim()
  if (!title) return
  submitting.value = true
  try {
    await createUserStory(props.projectId, { title })
    toast.showSuccess(t('userStories.storyCreated'), '')
    emit('created')
    close()
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    submitting.value = false
  }
}
</script>
