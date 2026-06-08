export const agentSkillsDocContent: Record<'en' | 'es', string> = {
  en: `# Agent Skills

Custom agent skills let maintainers and system admins extend the AI assistant with **markdown-defined tools**. Each skill declares when the agent may call it, what parameters it accepts, and a fixed HTTP request (or future step types) executed server-side.

Skills are **not arbitrary code** — the LLM cannot choose URLs at runtime. Only URLs and headers defined in stored skill definitions are used.

## Where to manage skills

| Scope | Who can edit | Location |
| --- | --- | --- |
| **Global** | System admin | Admin → Agent Skills |
| **Project** | Project maintainer+ | Project → Agents → Skills |

Secrets are managed on separate **Secrets** tabs (global or project). Never put secret values inside skill markdown files.

## Skill file format

Each skill is a single markdown file with YAML frontmatter and an optional body. The body is appended to the tool description shown to the LLM.

\`\`\`yaml
---
tool_name: fetch_open_issues
description: Fetch open issues from the external tracker
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    limit:
      type: integer
      default: 10
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/issues?project={{project_key}}&limit={{limit}}"
  headers:
    Authorization: "Bearer {{secret:TRACKER_TOKEN}}"
  timeout_seconds: 15
  max_response_bytes: 65536
response:
  json_path: "$.issues"
---
Use when the user asks about external tracker issues for their project.
\`\`\`

## Frontmatter fields

### Required

- **tool_name** — Unique identifier exposed to the LLM (\`^[a-z][a-z0-9_]{2,63}$\`). Cannot collide with built-in tools (e.g. \`calculator\`, \`search_tickets\`).
- **description** — Short summary of when to use the skill.
- **parameters** — JSON Schema object. Must include \`project_key\` in \`required\`.

### Optional

- **category** — Grouping label (default: \`integrations\`).
- **min_role** — Minimum project role to execute: \`guest\`, \`developer\`, or \`maintainer\` (default: \`guest\`).
- **request** — HTTP step configuration (required for HTTP skills).
- **response** — Optional response shaping.
- **allowed_hosts** — Extra host allowlist (SSRF protections still apply).

### request

| Field | Description |
| --- | --- |
| \`method\` | \`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`, or \`HEAD\` |
| \`url\` | Must use \`https://\` ( \`http://\` only when server \`DEBUG=true\` ) |
| \`headers\` | Optional header map |
| \`body\` | Optional string or JSON object |
| \`timeout_seconds\` | Default 15 |
| \`max_response_bytes\` | Default 65536 |

### response

- **json_path** — Optional path to extract from JSON body (e.g. \`$.issues\` or \`$.data.items\`).

## Template placeholders

In \`url\`, \`headers\`, and \`body\`:

- \`{{param_name}}\` — Replaced from tool call arguments (e.g. \`{{project_key}}\`, \`{{limit}}\`).
- \`{{secret:KEY_NAME}}\` — Replaced from project or global secret stores at execution time.

Example header:

\`\`\`yaml
headers:
  Authorization: "Bearer {{secret:TRACKER_TOKEN}}"
\`\`\`

## Built-in tools

The platform includes built-in skills (tickets, KB search, calculator, etc.). Custom \`tool_name\` values must not reuse those names.

**Calculator** (\`calculator\`) is a public built-in for deterministic math. HTTP requests are **internal only** — custom skills invoke them via the \`request\` block; the LLM cannot call HTTP directly.

## Visibility at runtime

- **Global skills** appear for users who belong to at least one project.
- **Project skills** appear for projects the user can access.
- At execution time, the skill checks \`project_key\`, \`min_role\`, and (for project skills) that the skill belongs to that project.

## Security

- SSRF protections block private IPs, localhost, and link-local addresses; DNS is resolved and checked.
- Optional per-skill \`allowed_hosts\` restricts hostnames further.
- Redirects are not followed.
- Responses are truncated to \`max_response_bytes\`.
- Skill execution is audit-logged (tool name, project, user, host — not secrets).

## Tips

1. Use **Validate** in the editor before saving to catch YAML or schema errors.
2. Keep descriptions specific so the agent picks the right tool.
3. Store API tokens in **Secrets**, reference them as \`{{secret:NAME}}\`.
4. Disable a skill with \`enabled: false\` (via the API) without deleting its definition.
5. Test with a narrow \`allowed_hosts\` list when integrating a known API.
`,

  es: `# Skills del agente

Los skills personalizados permiten a maintainers y administradores del sistema extender el asistente de IA con **herramientas definidas en markdown**. Cada skill declara cuándo el agente puede invocarlo, qué parámetros acepta y una petición HTTP fija (u otros pasos en el futuro) ejecutada en el servidor.

Los skills **no son código arbitrario** — el LLM no puede elegir URLs en tiempo de ejecución. Solo se usan URLs y encabezados definidos en las definiciones almacenadas.

## Dónde gestionar skills

| Ámbito | Quién puede editar | Ubicación |
| --- | --- | --- |
| **Global** | Administrador del sistema | Admin → Agent Skills |
| **Proyecto** | Maintainer+ del proyecto | Proyecto → Agentes → Skills |

Los secretos se gestionan en pestañas **Secretos** separadas (global o proyecto). Nunca coloques valores secretos dentro de los archivos markdown de skills.

## Formato del archivo

Cada skill es un archivo markdown con frontmatter YAML y un cuerpo opcional. El cuerpo se añade a la descripción de la herramienta mostrada al LLM.

\`\`\`yaml
---
tool_name: fetch_open_issues
description: Obtener incidencias abiertas del tracker externo
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    limit:
      type: integer
      default: 10
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/issues?project={{project_key}}&limit={{limit}}"
  headers:
    Authorization: "Bearer {{secret:TRACKER_TOKEN}}"
  timeout_seconds: 15
  max_response_bytes: 65536
response:
  json_path: "$.issues"
---
Usar cuando el usuario pregunte por incidencias del tracker externo.
\`\`\`

## Campos del frontmatter

### Obligatorios

- **tool_name** — Identificador único expuesto al LLM. No puede coincidir con herramientas integradas.
- **description** — Resumen breve de cuándo usar el skill.
- **parameters** — Esquema JSON Schema. Debe incluir \`project_key\` en \`required\`.

### Opcionales

- **category** — Etiqueta de agrupación (predeterminado: \`integrations\`).
- **min_role** — Rol mínimo del proyecto: \`guest\`, \`developer\` o \`maintainer\`.
- **request** — Configuración del paso HTTP.
- **response** — Formato opcional de respuesta.
- **allowed_hosts** — Lista adicional de hosts permitidos.

## Marcadores de plantilla

En \`url\`, \`headers\` y \`body\`:

- \`{{param_name}}\` — Sustituido por argumentos de la llamada (p. ej. \`{{project_key}}\`).
- \`{{secret:NOMBRE}}\` — Sustituido por secretos del proyecto o globales en tiempo de ejecución.

## Herramientas integradas

La plataforma incluye skills integrados (tickets, búsqueda KB, calculadora, etc.). Los \`tool_name\` personalizados no pueden reutilizar esos nombres.

**Calculator** es una herramienta pública para matemática determinista. Las peticiones HTTP son **solo internas** — los skills personalizados las invocan mediante el bloque \`request\`.

## Seguridad

- Protecciones SSRF bloquean IPs privadas y localhost.
- \`allowed_hosts\` opcional restringe hostnames.
- No se siguen redirecciones.
- Las respuestas se truncan según \`max_response_bytes\`.
- La ejecución se registra en auditoría (sin secretos).

## Consejos

1. Usa **Validar** en el editor antes de guardar.
2. Escribe descripciones específicas para que el agente elija la herramienta correcta.
3. Guarda tokens API en **Secretos** y referéncialos como \`{{secret:NOMBRE}}\`.
4. Desactiva un skill sin borrarlo cuando deje de usarse.
`,
}
