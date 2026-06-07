<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.agentSkills.title') }}</h1>
      <AdminSubNav />
    </div>

    <div class="settings-card">
      <AgentSkillsEditor
        :title="t('admin.agentSkills.globalTitle')"
        :description="t('admin.agentSkills.globalDescription')"
        :load-skills="listGlobalAgentSkills"
        :load-skill="getGlobalAgentSkill"
        :save-skill-api="upsertGlobalAgentSkill"
        :delete-skill-api="deleteGlobalAgentSkill"
        :validate-api="validateGlobalAgentSkill"
        :load-secrets="listGlobalAgentSecrets"
        :save-secret-api="setGlobalAgentSecret"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import AgentSkillsEditor from '@/components/admin/AgentSkillsEditor.vue'
import {
  listGlobalAgentSkills,
  getGlobalAgentSkill,
  upsertGlobalAgentSkill,
  deleteGlobalAgentSkill,
  validateGlobalAgentSkill,
  listGlobalAgentSecrets,
  setGlobalAgentSecret,
} from '@/api/agentSkills'

const { t } = useI18n()
</script>

<style scoped>
.admin-page {
  max-width: 960px;
  margin: 0 auto;
}
.admin-header {
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
