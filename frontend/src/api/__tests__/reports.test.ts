import { describe, it, expect } from 'vitest'

describe('Reports API interfaces', () => {
  it('exports expected types', async () => {
    const mod = await import('@/api/reports')
    expect(mod.getProjectSummary).toBeTypeOf('function')
    expect(mod.getVelocityReport).toBeTypeOf('function')
    expect(mod.getCycleTimeReport).toBeTypeOf('function')
    expect(mod.getCumulativeFlowReport).toBeTypeOf('function')
    expect(mod.getBurndownReport).toBeTypeOf('function')
    expect(mod.getSprintReport).toBeTypeOf('function')
  })
})

describe('Audit API interfaces', () => {
  it('exports expected types', async () => {
    const mod = await import('@/api/audit')
    expect(mod.getProjectAuditLog).toBeTypeOf('function')
  })
})
