# Domogato Accessibility

Domogato targets **WCAG 2.2 Level AA** compliance. Accessibility features are configurable at the platform level via **Admin → Accessibility**, with optional user overrides where the administrator allows them.

## Platform settings

Configure via **Admin → Accessibility** or environment variables (`ACCESSIBILITY_*`).

| Setting | Default | Description |
|---------|---------|-------------|
| `accessibility_enabled` | `true` | Master switch for accessibility features |
| `accessibility_compliance_target` | `wcag_2_2_aa` | Compliance target identifier |
| `accessibility_skip_link_enabled` | `true` | Show skip-to-main-content link |
| `accessibility_landmark_labels_enabled` | `true` | Label navigation landmarks |
| `accessibility_keyboard_drag_alternatives` | `false` | Keyboard move menus for drag-and-drop surfaces |
| `accessibility_board_keyboard_nav` | `false` | Arrow-key focus on board cards |
| `accessibility_timeline_keyboard_nav` | `false` | Keyboard navigation on timeline/Gantt |
| `accessibility_respect_reduced_motion` | `true` | Honor `prefers-reduced-motion` and user override |
| `accessibility_enhanced_focus_indicators` | `false` | Stronger focus rings |
| `accessibility_high_contrast_available` | `false` | Allow users to enable high contrast theme |
| `accessibility_live_region_verbosity` | `minimal` | Screen reader announcements: `off`, `minimal`, `standard`, `verbose` |
| `accessibility_chart_data_tables` | `false` | Collapsible data tables below charts |
| `accessibility_allow_user_motion_override` | `true` | Users can override reduced motion in `/settings` |
| `accessibility_allow_user_contrast_override` | `true` | Users can toggle high contrast |
| `accessibility_allow_user_live_region_override` | `false` | Users can change announcement verbosity |
| `accessibility_ci_audit_level` | `warnings` | CI strictness: `none`, `warnings`, `blocking` |

### API

- `GET/PUT /api/v1/system-settings/accessibility` — system admin
- `GET /api/v1/auth/config` — includes `accessibility` block for frontend bootstrap

### Environment variables

Mirror any platform setting at deploy time, e.g.:

```bash
ACCESSIBILITY_KEYBOARD_DRAG_ALTERNATIVES=true
ACCESSIBILITY_CI_AUDIT_LEVEL=blocking
```

## User preferences

Users can override (when allowed) in **Settings → Accessibility**:

```json
{
  "accessibility": {
    "reducedMotion": true,
    "highContrast": false,
    "liveRegionVerbosity": "standard"
  }
}
```

`null` values use platform defaults.

## Development

### Automated testing

```bash
# Frontend accessibility e2e (axe)
cd frontend && npm run test:a11y

# ESLint accessibility rules
cd frontend && npm run lint
```

Set `ACCESSIBILITY_CI_AUDIT_LEVEL=blocking` in CI to fail on serious/critical axe violations.

### Design principles

1. **Baseline fixes are always on** — labels, focus visibility, semantic HTML
2. **Intrusive enhancements are opt-in** — keyboard drag alternatives, verbose announcements
3. **Mouse workflows unchanged by default** — drag-and-drop remains primary interaction

See [ACCESSIBILITY_AUDIT.md](./ACCESSIBILITY_AUDIT.md) for the full audit report.
