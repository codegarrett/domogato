<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.agentSkills.title') }}</h1>
      <AdminSubNav />
      <AdminAgentSkillsSubNav class="mt-2" />
    </div>

    <div class="settings-card">
      <AgentSecretsEditor
        :title="t('agentSkills.secretsTitle')"
        :description="t('agentSkills.secretsDescription')"
        :load-secrets="listGlobalAgentSecrets"
        :save-secret-api="setGlobalAgentSecret"
        :reveal-secret-api="revealGlobalAgentSecret"
        :delete-secret-api="deleteGlobalAgentSecret"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import AdminAgentSkillsSubNav from '@/components/common/AdminAgentSkillsSubNav.vue'
import AgentSecretsEditor from '@/components/admin/AgentSecretsEditor.vue'
import {
  listGlobalAgentSecrets,
  setGlobalAgentSecret,
  revealGlobalAgentSecret,
  deleteGlobalAgentSecret,
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
.mt-2 {
  margin-top: 0.5rem;
}
</style>
