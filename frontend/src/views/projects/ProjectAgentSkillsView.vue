<template>
  <div class="project-agents-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('nav.agents') }}</h1>
      <ProjectAgentsSubNav />
    </div>

    <div class="settings-card">
      <AgentSkillsEditor
        :title="t('agentSkills.projectTitle')"
        :description="t('agentSkills.projectDescription')"
        :load-skills="() => listProjectAgentSkills(projectId)"
        :load-skill="(slug) => getProjectAgentSkill(projectId, slug)"
        :save-skill-api="(slug, payload) => upsertProjectAgentSkill(projectId, slug, payload)"
        :delete-skill-api="(slug) => deleteProjectAgentSkill(projectId, slug)"
        :validate-api="(contentMd) => validateProjectAgentSkill(projectId, contentMd)"
        :generate-skill-api="(payload) => generateProjectAgentSkill(projectId, payload)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AgentSkillsEditor from '@/components/admin/AgentSkillsEditor.vue'
import ProjectAgentsSubNav from '@/components/common/ProjectAgentsSubNav.vue'
import {
  listProjectAgentSkills,
  getProjectAgentSkill,
  upsertProjectAgentSkill,
  deleteProjectAgentSkill,
  validateProjectAgentSkill,
  generateProjectAgentSkill,
} from '@/api/agentSkills'

const { t } = useI18n()
const route = useRoute()
const projectId = computed(() => route.params.projectId as string)
</script>

<style scoped>
.project-agents-page {
  max-width: 960px;
}
.page-header {
  margin-bottom: 1.25rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.settings-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  padding: 1.25rem;
}
</style>
