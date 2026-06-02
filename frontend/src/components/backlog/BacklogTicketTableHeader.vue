<script setup lang="ts">
import './backlog-ticket-grid.css'
</script>

<template>
  <div class="backlog-ticket-grid backlog-ticket-grid--header">
    <div class="grid-cell" aria-hidden="true" />
    <div class="grid-cell" aria-hidden="true" />
    <div class="grid-cell grid-cell--start">{{ $t('projects.key') }}</div>
    <div class="grid-cell grid-cell--start">{{ $t('tickets.title') }}</div>
    <div class="grid-cell">{{ $t('tickets.type') }}</div>
    <div class="grid-cell">{{ $t('tickets.priority') }}</div>
    <div class="grid-cell">{{ $t('tickets.assignee') }}</div>
    <div class="grid-cell">{{ $t('common.status') }}</div>
    <div class="grid-cell">{{ $t('sprints.pointsCol') }}</div>
  </div>
</template>
