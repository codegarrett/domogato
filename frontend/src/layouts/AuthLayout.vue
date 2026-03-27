<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-title">{{ $t('nav.appName') }}</h1>
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.auth-layout {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-ground);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  background: var(--p-content-background);
  border-radius: var(--p-border-radius);
  box-shadow: var(--p-overlay-modal-shadow);
}
.auth-title {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--p-primary-color);
}
</style>
