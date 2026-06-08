import type { APIRequestContext } from '@playwright/test'
import { e2eConfig } from '../e2e.config'

export class E2EApiClient {
  constructor(private request: APIRequestContext) {}

  async login(email: string, password: string): Promise<string> {
    const res = await this.request.post(`${e2eConfig.apiURL}/auth/login`, {
      data: { email, password },
    })
    if (!res.ok()) throw new Error(`Login failed: ${res.status()}`)
    const body = await res.json()
    return body.access_token as string
  }

  async createTicket(projectId: string, title: string, token?: string): Promise<unknown> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await this.request.post(`${e2eConfig.apiURL}/projects/${projectId}/tickets`, {
      data: { title, ticket_type: 'task', priority: 'medium' },
      headers,
    })
    if (!res.ok()) throw new Error(`Create ticket failed: ${res.status()}`)
    return res.json()
  }
}
