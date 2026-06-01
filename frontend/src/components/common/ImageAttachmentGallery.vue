<template>
  <div v-if="imageAttachments.length > 0" class="image-attachment-gallery flex flex-wrap gap-3">
    <div
      v-for="att in imageAttachments"
      :key="att.id"
      class="image-attachment-item border-round overflow-hidden surface-border border-1"
    >
      <button
        type="button"
        class="image-attachment-thumb"
        :aria-label="$t('attachments.previewImage', { name: att.filename })"
        @click="openPreview(att)"
      >
        <img
          :src="assetUrl(resolvePath(att))"
          :alt="att.filename"
          class="image-attachment-thumb-img"
        />
      </button>
      <Button
        icon="pi pi-download"
        rounded
        size="small"
        severity="secondary"
        class="image-attachment-item-download"
        :aria-label="$t('attachments.download')"
        @click="download(att)"
      />
    </div>

    <Dialog
      v-model:visible="showPreview"
      modal
      dismissable-mask
      :show-header="false"
      :style="{ width: 'min(92vw, 56rem)' }"
      :content-style="{ padding: 0, overflow: 'hidden' }"
      class="image-attachment-preview-dialog"
      @hide="previewAttachment = null"
    >
      <div v-if="previewAttachment" class="image-attachment-preview-wrap">
        <img
          :src="previewImageUrl"
          :alt="previewAttachment.filename"
          class="image-attachment-preview-full"
        />
        <Button
          icon="pi pi-download"
          rounded
          severity="secondary"
          class="image-attachment-preview-download"
          :aria-label="$t('attachments.download')"
          @click="download(previewAttachment)"
        />
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToastService } from '@/composables/useToast'
import { assetUrl } from '@/utils/assetUrl'
import { downloadFromApi } from '@/utils/download'

export interface ImageAttachmentItem {
  id: string
  filename: string
  content_type: string
  download_path?: string
}

const props = defineProps<{
  attachments: ImageAttachmentItem[]
  resolveDownloadPath?: (item: ImageAttachmentItem) => string
}>()

const { t } = useI18n()
const toast = useToastService()
const showPreview = ref(false)
const previewAttachment = ref<ImageAttachmentItem | null>(null)

const imageAttachments = computed(() =>
  props.attachments.filter((a) => a.content_type.startsWith('image/')),
)

const previewImageUrl = computed(() => {
  if (!previewAttachment.value) return undefined
  return assetUrl(resolvePath(previewAttachment.value))
})

function resolvePath(item: ImageAttachmentItem): string {
  if (props.resolveDownloadPath) return props.resolveDownloadPath(item)
  return item.download_path ?? `/attachments/${item.id}/download`
}

function openPreview(att: ImageAttachmentItem) {
  previewAttachment.value = att
  showPreview.value = true
}

async function download(att: ImageAttachmentItem) {
  try {
    await downloadFromApi(resolvePath(att), att.filename)
  } catch {
    toast.showError(t('attachments.downloadError'), '')
  }
}
</script>

<style scoped>
.image-attachment-item {
  position: relative;
  width: 120px;
  height: 90px;
}
.image-attachment-thumb {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.image-attachment-thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-attachment-item-download {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 1.75rem !important;
  height: 1.75rem !important;
  min-width: 1.75rem !important;
  padding: 0 !important;
  background: rgba(15, 23, 42, 0.72) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  color: #fff !important;
}
.image-attachment-item-download:hover {
  background: rgba(15, 23, 42, 0.9) !important;
}
.image-attachment-preview-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-950, #0f172a);
}
.image-attachment-preview-full {
  display: block;
  max-width: 100%;
  max-height: min(80vh, 48rem);
  width: auto;
  height: auto;
}
.image-attachment-preview-download {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(15, 23, 42, 0.72) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  color: #fff !important;
}
.image-attachment-preview-download:hover {
  background: rgba(15, 23, 42, 0.9) !important;
}
</style>
