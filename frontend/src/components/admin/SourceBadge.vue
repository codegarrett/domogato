<template>
  <span v-if="locked" class="source-badge locked" :title="t('admin.setByEnv')">
    <i class="pi pi-lock" />
    {{ t('admin.envVar') }}
  </span>
  <span v-else-if="source === 'database'" class="source-badge database">
    {{ t('admin.database') }}
  </span>
  <span v-else class="source-badge default-source">
    {{ t('admin.default') }}
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  source: string
  locked: boolean
}>()

const { t } = useI18n()
</script>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}
.source-badge.locked {
  background: color-mix(in srgb, var(--p-orange-500) 15%, transparent);
  color: var(--p-orange-500);
}
.source-badge.locked i {
  font-size: 0.625rem;
}
.source-badge.database {
  background: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
  color: var(--p-primary-color);
}
.source-badge.default-source {
  background: var(--app-card-alt-bg);
  color: var(--p-text-muted-color);
}
</style>
