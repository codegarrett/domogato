import type { APIRequestContext, APIResponse } from '@playwright/test'

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



  authHeaders(token: string): Record<string, string> {

    return { Authorization: `Bearer ${token}` }

  }



  async createTicket(projectId: string, title: string, token: string): Promise<APIResponse> {

    return this.request.post(`${e2eConfig.apiURL}/projects/${projectId}/tickets`, {

      data: { title, ticket_type: 'task', priority: 'medium' },

      headers: this.authHeaders(token),

    })

  }



  async patchUserStory(

    projectId: string,

    storyId: string,

    body: Record<string, unknown>,

    token: string,

  ): Promise<APIResponse> {

    return this.request.patch(

      `${e2eConfig.apiURL}/projects/${projectId}/user-stories/${storyId}`,

      { data: body, headers: this.authHeaders(token) },

    )

  }



  async transitionTicket(

    ticketId: string,

    workflowStatusId: string,

    token: string,

  ): Promise<APIResponse> {

    return this.request.post(`${e2eConfig.apiURL}/tickets/${ticketId}/transition`, {

      data: { workflow_status_id: workflowStatusId },

      headers: this.authHeaders(token),

    })

  }



  async getTicketTransitions(ticketId: string, token: string): Promise<APIResponse> {

    return this.request.get(`${e2eConfig.apiURL}/tickets/${ticketId}/transitions`, {

      headers: this.authHeaders(token),

    })

  }



  async createTicketsFromStories(
    projectId: string,
    storyIds: string[],
    token: string,
  ): Promise<APIResponse> {
    return this.request.post(
      `${e2eConfig.apiURL}/projects/${projectId}/user-stories/create-tickets`,
      { data: { user_story_ids: storyIds }, headers: this.authHeaders(token) },
    )
  }

  async createTicketFromIssueReports(
    projectId: string,
    reportIds: string[],
    token: string,
  ): Promise<APIResponse> {
    return this.request.post(
      `${e2eConfig.apiURL}/projects/${projectId}/issue-reports/create-ticket`,
      { data: { issue_report_ids: reportIds }, headers: this.authHeaders(token) },
    )
  }

  async createUserStory(
    projectId: string,
    title: string,
    token: string,
  ): Promise<APIResponse> {
    return this.request.post(
      `${e2eConfig.apiURL}/projects/${projectId}/user-stories`,
      { data: { title }, headers: this.authHeaders(token) },
    )
  }

  static async expectForbidden(res: APIResponse, substring: string): Promise<void> {

    const body = await res.json()

    const detail = (body.detail ?? body.error?.message ?? '') as string

    if (res.status() !== 403 || !detail.includes(substring)) {

      throw new Error(`Expected 403 with "${substring}", got ${res.status()}: ${detail}`)

    }

  }

}


