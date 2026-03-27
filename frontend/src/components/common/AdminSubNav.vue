<template>
  <nav class="admin-sub-nav">
    <router-link
      to="/admin/users"
      class="sub-nav-link"
      :class="{ active: route.path === '/admin/users' }"
    >
      <i class="pi pi-users" />
      {{ t('admin.users') }}
    </router-link>
    <router-link
      to="/admin/organizations"
      class="sub-nav-link"
      :class="{ active: route.path === '/admin/organizations' }"
    >
      <i class="pi pi-building" />
      {{ t('admin.organizations') }}
    </router-link>
    <router-link
      to="/admin/auth"
      class="sub-nav-link"
      :class="{ active: route.path === '/admin/auth' }"
    >
      <i class="pi pi-lock" />
      {{ t('admin.authentication') }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<style scoped>
.admin-sub-nav {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--app-card-alt-bg);
  border-radius: 8px;
  width: fit-content;
}
.sub-nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  text-decoration: none;
  transition: all 0.15s;
}
.sub-nav-link:hover {
  color: var(--p-text-color);
  background: var(--p-content-background);
}
.sub-nav-link.active {
  color: var(--p-primary-color);
  background: var(--p-content-background);
  font-weight: 600;
  box-shadow: var(--shadow-md);
}
</style>
