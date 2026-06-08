<template>
  <div class="docs-page">
    <div class="docs-header">
      <h1 class="page-title">{{ t('docs.title') }}</h1>
      <p class="page-subtitle">{{ t('docs.subtitle') }}</p>
      <DocumentationSubNav />
    </div>

    <div class="docs-card">
      <p class="intro">{{ t('docs.indexIntro') }}</p>
      <ul class="topic-list">
        <li>
          <router-link to="/docs/agent-skills" class="topic-link">
            <i class="pi pi-bolt" />
            <div>
              <span class="topic-title">{{ t('docs.agentSkills') }}</span>
              <span class="topic-desc">{{ t('docs.agentSkillsBlurb') }}</span>
            </div>
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DocumentationSubNav from '@/components/common/DocumentationSubNav.vue'

const { t } = useI18n()
</script>

<style scoped>
.docs-page {
  max-width: 960px;
  margin: 0 auto;
}
.docs-header {
  margin-bottom: 1.25rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
}
.page-subtitle {
  margin: 0 0 0.75rem;
  color: var(--p-text-muted-color);
  font-size: 0.9375rem;
}
.docs-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}
.intro {
  margin: 0 0 1rem;
  color: var(--p-text-color);
  line-height: 1.6;
}
.topic-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.topic-link {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.topic-link:hover {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 6%, var(--p-content-background));
}
.topic-link i {
  color: var(--p-primary-color);
  font-size: 1.125rem;
  margin-top: 0.125rem;
}
.topic-title {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.topic-desc {
  display: block;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}
</style>
