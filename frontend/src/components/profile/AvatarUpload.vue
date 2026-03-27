<template>
  <div class="avatar-upload">
    <div class="avatar-preview" @click="openFilePicker">
      <img v-if="currentUrl" :src="currentUrl" alt="Avatar" class="avatar-img" />
      <Avatar
        v-else
        :label="initials"
        shape="circle"
        class="avatar-placeholder"
        size="xlarge"
      />
      <div class="avatar-overlay">
        <i class="pi pi-camera" />
      </div>
    </div>
    <div class="avatar-actions">
      <Button
        :label="t('profile.changeAvatar')"
        icon="pi pi-upload"
        size="small"
        outlined
        @click="openFilePicker"
        :loading="uploading"
      />
      <Button
        v-if="currentUrl"
        :label="t('profile.removeAvatar')"
        icon="pi pi-trash"
        size="small"
        text
        severity="danger"
        @click="onRemove"
        :loading="removing"
      />
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden-input"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import axios from 'axios'
import { requestAvatarUpload, confirmAvatarUpload, deleteAvatar } from '@/api/users'
import { useToastService } from '@/composables/useToast'

defineProps<{
  currentUrl: string | null
  initials: string
}>()

const emit = defineEmits<{
  (e: 'updated', url: string | null): void
}>()

const { t } = useI18n()
const toast = useToastService()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const removing = ref(false)

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    toast.showError('Error', t('profile.avatarTooLarge'))
    return
  }

  uploading.value = true
  try {
    const { upload_url, avatar_key } = await requestAvatarUpload(file.name, file.type)
    await axios.put(upload_url, file, {
      headers: { 'Content-Type': file.type },
    })
    const { avatar_url } = await confirmAvatarUpload(avatar_key)
    emit('updated', avatar_url)
    toast.showSuccess(t('common.success'), t('profile.avatarUpdated'))
  } catch {
    toast.showError('Error', t('profile.avatarUploadFailed'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function onRemove() {
  removing.value = true
  try {
    await deleteAvatar()
    emit('updated', null)
    toast.showSuccess(t('common.success'), t('profile.avatarRemoved'))
  } catch {
    toast.showError('Error', t('profile.avatarRemoveFailed'))
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.avatar-upload {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.avatar-preview {
  position: relative;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 100% !important;
  height: 100% !important;
  font-size: 1.5rem !important;
}
.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-bg);
  color: white;
  font-size: 1.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}
.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hidden-input {
  display: none;
}
</style>
