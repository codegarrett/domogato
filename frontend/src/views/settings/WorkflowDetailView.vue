<template>
  <WorkflowEditor v-if="workflowId" :workflowId="workflowId" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import WorkflowEditor from '@/components/workflows/WorkflowEditor.vue'

const route = useRoute()
const workflowId = computed(() => route.params.workflowId as string)
</script>
