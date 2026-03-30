<template>
  <div v-if="loading" class="flex align-items-center gap-2 p-3 text-color-secondary">
    <i class="pi pi-spin pi-spinner" />
    <span>{{ $t('common.loading') }}</span>
  </div>
  <div v-else-if="reports.length > 0" class="similar-reports-panel">
    <p class="text-sm font-semibold mb-2">{{ $t('issueReports.similarReports') }}</p>
    <div
      v-for="report in reports"
      :key="report.id"
      class="similar-report-item surface-hover border-round p-3 mb-2 cursor-pointer"
      @click="$emit('select', report)"
    >
      <div class="flex align-items-center justify-content-between mb-1">
        <span class="font-semibold text-sm">{{ report.title }}</span>
        <Tag
          :severity="report.priority === 'critical' ? 'danger' : report.priority === 'high' ? 'warn' : 'info'"
          :value="report.priority"
          class="text-xs"
        />
      </div>
      <div class="flex align-items-center gap-3 text-xs text-color-secondary">
        <span class="flex align-items-center gap-1">
          <i class="pi pi-users" />
          {{ report.reporter_count }}
        </span>
        <span>{{ (report.similarity_score * 100).toFixed(0) }}% match</span>
      </div>
      <p v-if="report.description" class="text-sm mt-1 text-color-secondary" style="max-height: 3rem; overflow: hidden">
        {{ report.description.substring(0, 150) }}{{ report.description.length > 150 ? '...' : '' }}
      </p>
      <Button
        :label="$t('issueReports.matchesMyIssue')"
        icon="pi pi-check"
        size="small"
        severity="success"
        text
        class="mt-2"
        @click.stop="$emit('select', report)"
      />
    </div>
  </div>
  <div v-else-if="searched" class="p-3 text-color-secondary text-sm">
    {{ $t('issueReports.noSimilarReports') }}
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { SimilarReport } from '@/api/issue-reports'

defineProps<{
  reports: SimilarReport[]
  loading: boolean
  searched: boolean
}>()

defineEmits<{
  select: [report: SimilarReport]
}>()
</script>

<style scoped>
.similar-report-item {
  border: 1px solid var(--p-content-border-color);
  transition: background 0.15s;
}
.similar-report-item:hover {
  background: var(--app-hover-bg);
}
</style>
