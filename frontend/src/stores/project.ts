import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listProjects, getProject, type Project } from '@/api/projects'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)

  const currentProjectId = computed(() => currentProject.value?.id ?? null)

  async function fetchProjects(orgId: string) {
    loading.value = true
    try {
      const result = await listProjects(orgId)
      projects.value = result.items
    } finally {
      loading.value = false
    }
  }

  async function setCurrentProject(projectId: string) {
    const existing = projects.value.find(p => p.id === projectId)
    if (existing) {
      currentProject.value = existing
    } else {
      currentProject.value = await getProject(projectId)
    }
  }

  function clearCurrentProject() {
    currentProject.value = null
  }

  return { projects, currentProject, currentProjectId, loading, fetchProjects, setCurrentProject, clearCurrentProject }
})
