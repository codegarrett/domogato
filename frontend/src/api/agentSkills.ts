import apiClient from './client'

export interface AgentSkillListItem {
  id: string
  slug: string
  name: string
  enabled: boolean
  tool_name: string | null
  updated_at: string
}

export interface AgentSkillDetail extends AgentSkillListItem {
  content_md: string
  description: string | null
  category: string | null
}

export interface AgentSkillUpsert {
  name: string
  content_md: string
  enabled?: boolean
}

export interface AgentSkillValidateResponse {
  valid: boolean
  tool_name?: string | null
  description?: string | null
  category?: string | null
  errors: string[]
}

export interface AgentSecretsRead {
  keys: string[]
}

const DEFAULT_SKILL_TEMPLATE = `---
tool_name: fetch_example_data
description: Fetch example data from an external API
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    query:
      type: string
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/data?q={{query}}"
  headers:
    Authorization: "Bearer {{secret:EXAMPLE_TOKEN}}"
  timeout_seconds: 15
  max_response_bytes: 65536
response:
  json_path: "$.data"
---
Use when the user asks about external example data.
`

export { DEFAULT_SKILL_TEMPLATE }

export async function listProjectAgentSkills(projectId: string) {
  const { data } = await apiClient.get<AgentSkillListItem[]>(
    `/projects/${projectId}/agent-skills`,
  )
  return data
}

export async function getProjectAgentSkill(projectId: string, slug: string) {
  const { data } = await apiClient.get<AgentSkillDetail>(
    `/projects/${projectId}/agent-skills/${slug}`,
  )
  return data
}

export async function upsertProjectAgentSkill(
  projectId: string,
  slug: string,
  payload: AgentSkillUpsert,
) {
  const { data } = await apiClient.put<AgentSkillDetail>(
    `/projects/${projectId}/agent-skills/${slug}`,
    payload,
  )
  return data
}

export async function deleteProjectAgentSkill(projectId: string, slug: string) {
  await apiClient.delete(`/projects/${projectId}/agent-skills/${slug}`)
}

export async function validateProjectAgentSkill(projectId: string, contentMd: string) {
  const { data } = await apiClient.post<AgentSkillValidateResponse>(
    `/projects/${projectId}/agent-skills/validate`,
    { content_md: contentMd },
  )
  return data
}

export async function listProjectAgentSecrets(projectId: string) {
  const { data } = await apiClient.get<AgentSecretsRead>(
    `/projects/${projectId}/agent-skills-secrets`,
  )
  return data
}

export async function setProjectAgentSecret(
  projectId: string,
  key: string,
  value: string,
) {
  await apiClient.put(`/projects/${projectId}/agent-skills-secrets`, { key, value })
}

export async function deleteProjectAgentSecret(projectId: string, key: string) {
  await apiClient.delete(`/projects/${projectId}/agent-skills-secrets`, { data: { key } })
}

export async function listGlobalAgentSkills() {
  const { data } = await apiClient.get<AgentSkillListItem[]>('/admin/agent-skills')
  return data
}

export async function getGlobalAgentSkill(slug: string) {
  const { data } = await apiClient.get<AgentSkillDetail>(`/admin/agent-skills/${slug}`)
  return data
}

export async function upsertGlobalAgentSkill(slug: string, payload: AgentSkillUpsert) {
  const { data } = await apiClient.put<AgentSkillDetail>(
    `/admin/agent-skills/${slug}`,
    payload,
  )
  return data
}

export async function deleteGlobalAgentSkill(slug: string) {
  await apiClient.delete(`/admin/agent-skills/${slug}`)
}

export async function validateGlobalAgentSkill(contentMd: string) {
  const { data } = await apiClient.post<AgentSkillValidateResponse>(
    '/admin/agent-skills/validate',
    { content_md: contentMd },
  )
  return data
}

export async function listGlobalAgentSecrets() {
  const { data } = await apiClient.get<AgentSecretsRead>('/admin/agent-skills/secrets')
  return data
}

export async function setGlobalAgentSecret(key: string, value: string) {
  await apiClient.put('/admin/agent-skills/secrets', { key, value })
}

export async function deleteGlobalAgentSecret(key: string) {
  await apiClient.delete('/admin/agent-skills/secrets', { data: { key } })
}
