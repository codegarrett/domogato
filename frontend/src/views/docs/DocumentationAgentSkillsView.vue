<template>
  <div class="docs-page">
    <div class="docs-header">
      <h1 class="page-title">{{ t('docs.title') }}</h1>
      <DocumentationSubNav />
    </div>

    <div class="docs-card docs-content">
      <RichContent :content="docContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DocumentationSubNav from '@/components/common/DocumentationSubNav.vue'
import RichContent from '@/components/common/RichContent.vue'
import { agentSkillsDocContent } from '@/content/docs/agentSkills'
import { getLocale } from '@/i18n'

const { t, locale } = useI18n()

const docContent = computed(() => {
  const lang = (locale.value || getLocale()) as 'en' | 'es'
  return agentSkillsDocContent[lang] ?? agentSkillsDocContent.en
})
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
  margin: 0 0 0.75rem;
}
.docs-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}
.docs-content :deep(.prose) {
  max-width: none;
}
</style>
