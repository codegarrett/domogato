# Domogato Accessibility Audit Report

**Date:** 2026-06-07  
**Target:** WCAG 2.2 Level AA  
**Scope:** P0/P1 routes (app shell, tickets, board, chat, auth, reports)

## Executive summary

Baseline audit identified systemic gaps in semantic HTML, focus management, keyboard alternatives for drag-and-drop, and automated enforcement. Remediation is organized in three waves with platform-configurable opt-in features to avoid disrupting existing mouse-first workflows.

## Audit methodology

| Method | Tool / approach |
|--------|----------------|
| Automated | `@axe-core/playwright` on P0 routes (`frontend/e2e/a11y.spec.ts`) |
| Static analysis | `eslint-plugin-vuejs-accessibility` (warn level) |
| Manual | WCAG 2.2 checklist per principle (below) |

## Findings by WCAG principle

### 1. Perceivable

| ID | Criterion | Severity | Location | Wave | Platform toggle |
|----|-----------|----------|----------|------|-----------------|
| P-01 | 1.1.1 Non-text Content | Serious | Icon-only buttons app-wide | A | No |
| P-02 | 1.3.1 Info and Relationships | Serious | Ticket table CSS grid without table/grid semantics | A | No |
| P-03 | 1.4.3 Contrast (Minimum) | Moderate | Muted text, board status dots (color-only) | A | No |
| P-04 | 1.1.1 / 1.3.1 | Serious | Charts (canvas only) | B | `accessibility_chart_data_tables` |

### 2. Operable

| ID | Criterion | Severity | Location | Wave | Platform toggle |
|----|-----------|----------|----------|------|-----------------|
| O-01 | 2.1.1 Keyboard | Critical | Notification bell (`<div @click>`) | A | No |
| O-02 | 2.4.1 Bypass Blocks | Moderate | No skip link | A | `accessibility_skip_link_enabled` |
| O-03 | 2.4.7 Focus Visible | Serious | `outline: none` on chat/command palette inputs | A | No |
| O-04 | 2.4.11 Focus Not Obscured | Moderate | Chat flyout non-modal drawer | C | No |
| O-05 | 2.5.7 Dragging Movements | Serious | Board, backlog, workflow editor | B | `accessibility_keyboard_drag_alternatives` |
| O-06 | 2.5.8 Target Size | Moderate | Small icon buttons | A | No |
| O-07 | 2.1.1 Keyboard | Serious | Command palette results (`<div @click>`) | A | No |
| O-08 | 2.1.1 Keyboard | Serious | Member picker, chat conversation list | C | No |

### 3. Understandable

| ID | Criterion | Severity | Location | Wave | Platform toggle |
|----|-----------|----------|----------|------|-----------------|
| U-01 | 3.3.2 Labels or Instructions | Serious | Custom fields (placeholder-only) | A | No |
| U-02 | 3.3.2 Labels or Instructions | Moderate | App settings toggles | A | No |
| U-03 | 3.3.8 Accessible Authentication | Moderate | Login/register (mostly compliant) | A | No |

### 4. Robust

| ID | Criterion | Severity | Location | Wave | Platform toggle |
|----|-----------|----------|----------|------|-----------------|
| R-01 | 4.1.2 Name, Role, Value | Serious | Inline pickers missing `aria-expanded` | C | No |
| R-02 | 4.1.3 Status Messages | Moderate | Chat streaming without live regions | A | `accessibility_live_region_verbosity` |
| R-03 | 4.1.1 Parsing / lang | Moderate | `lang` not set on initial boot | A | No |

## Route matrix results (automated baseline)

| Route | Priority | axe critical | axe serious | Status |
|-------|----------|--------------|-------------|--------|
| `/auth/login` | P0 | 0 | TBD | CI monitored |
| `/` (dashboard) | P0 | — | — | Requires auth |
| Ticket list/detail | P0 | — | — | Manual review |
| Board | P0 | — | — | Wave B/C |
| Chat flyout | P0 | — | — | Wave A/C |

## Remediation status

| Wave | Description | Status |
|------|-------------|--------|
| A | Baseline fixes (labels, focus, skip link, notification bell, chat live regions) | Implemented |
| B | Opt-in keyboard drag, board nav, chart data tables, high contrast | Implemented |
| C | Timeline, inline pickers, member picker, chat flyout focus | Implemented |
| Platform | `system_settings` accessibility keys + admin UI | Implemented |
| CI | axe Playwright + ESLint a11y plugin | Implemented |

## Screen reader smoke test checklist

- [ ] NVDA/VoiceOver: skip link focuses main content
- [ ] Shell navigation: sidebar tree expandable via keyboard
- [ ] Ticket list: sortable headers announce sort direction
- [ ] Board: move ticket via keyboard menu when enabled
- [ ] Chat: message list announces new messages at configured verbosity
- [ ] Login: form fields have associated labels

## Next steps

1. Run authenticated axe scans in CI with test credentials
2. Promote ESLint a11y rules from `warn` to `error` after Wave A stabilizes
3. Manual VPAT/ACR documentation for enterprise customers
