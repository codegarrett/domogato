# File Storage Architecture

**Status:** Current (2026-05)

Domogato stores binary files (ticket attachments, issue-report attachments, KB attachments, user avatars) in **S3-compatible object storage** (MinIO in Docker, AWS S3 or similar in production). **Clients never talk to S3 directly.** All uploads and downloads go through the FastAPI service, which enforces RBAC before reading or writing objects.

See also: [ADR-009 amendment](phase_1/DECISIONS.md#adr-009-file-storage--s3-compatible-api-proxied-through-backend) in `phase_1/DECISIONS.md`.

---

## Design goals

| Goal | How it is met |
|------|----------------|
| Authorization on every file access | API checks project/ticket/report/page role before `put_object` / streaming download |
| Works in Docker/production | `S3_ENDPOINT_URL` is an internal hostname (`http://minio:9000`); browsers only see `/api/v1/...` |
| Same code path for MinIO and AWS S3 | `storage_service.py` uses aioboto3 with configurable endpoint |
| Room for caching later | Download endpoints stream from S3; add Redis/nginx cache in front of those routes without changing clients |

---

## Component diagram

```
┌─────────────┐     HTTPS (JWT)      ┌─────────────┐     S3 API (private)   ┌─────────────┐
│   Browser   │ ◄──────────────────► │  FastAPI    │ ◄──────────────────► │ MinIO / S3  │
│  (Vue SPA)  │   multipart upload   │  + Celery   │   put/get/delete     │   bucket    │
│             │   streamed download  │             │                      │             │
└─────────────┘                      └─────────────┘                      └─────────────┘
```

**Celery** (e.g. KB embedding tasks) also uses `storage_service.get_object_bytes()` — same internal S3 access as the API.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `S3_ENDPOINT_URL` | Internal URL for API/celery only (e.g. `http://minio:9000`) |
| `S3_ACCESS_KEY_ID` | Access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |
| `S3_BUCKET_NAME` | Bucket name (default `projecthub-attachments`) |

Do **not** expose MinIO to the public internet for application file serving. Nginx does not need a route to MinIO for normal usage.

---

## Upload flow

1. Client sends `POST` with `multipart/form-data` and field name **`file`**.
2. API validates auth + minimum project role + content type + size.
3. API writes to S3 via `put_object`, then persists metadata in PostgreSQL (`s3_key`, filename, content type, size).

**Max sizes:** 100 MB (attachments), 5 MB (avatars).

### Endpoints

| Resource | Upload |
|----------|--------|
| Ticket attachment | `POST /api/v1/tickets/{ticket_id}/attachments` |
| Issue report attachment | `POST /api/v1/projects/{project_id}/issue-reports/{report_id}/attachments` |
| KB page attachment | `POST /api/v1/kb/pages/{page_id}/attachments` |
| User avatar | `POST /api/v1/users/me/avatar` |

**Response:** JSON metadata (`AttachmentRead`, `KBAttachmentRead`, etc.) — no `upload_url`. Issue report attachments include a `download_path` field (e.g. `/api/v1/issue-report-attachments/{id}/download`) for use with `assetUrl()` in the UI.

Legacy `http://minio:9000/...` URLs in report descriptions are rewritten to API paths when a report is loaded.

---

## Download flow

1. Client calls `GET …/download` (or `GET /users/{user_id}/avatar`) with `Authorization: Bearer …` **or** `?access_token=` (for `<img src>`).
2. API validates auth + RBAC.
3. API streams the object from S3 with `Content-Disposition` (attachment filename or inline for avatars).

### Endpoints

| Resource | Download |
|----------|----------|
| Ticket attachment | `GET /api/v1/attachments/{attachment_id}/download` |
| Issue report attachment | `GET /api/v1/issue-report-attachments/{attachment_id}/download` |
| KB attachment | `GET /api/v1/kb/attachments/{attachment_id}/download` |
| User avatar | `GET /api/v1/users/{user_id}/avatar` |

**Response:** raw file bytes (not JSON with a URL).

---

## Avatars

- **Stored in DB:** `users.avatar_url` holds either an S3 key (`users/{id}/avatar/...`), a legacy full MinIO URL (migrated at read time), or an external OIDC `picture` URL.
- **Returned to clients:** API paths like `/api/v1/users/{user_id}/avatar` for uploaded avatars; external URLs unchanged.
- **Serving:** `GET /users/{user_id}/avatar` streams from S3 with `Content-Disposition: inline`.

---

## S3 key layout

```
projects/{project_id}/attachments/{uuid}_{filename}
projects/{project_id}/kb/{space_id}/{page_id}/{uuid}_{filename}
users/{user_id}/avatar/{uuid}_{filename}
```

---

## Backend modules

| Module | Role |
|--------|------|
| `app/services/storage_service.py` | `put_object`, `get_object_bytes`, `iter_object_chunks`, `delete_object` |
| `app/utils/file_responses.py` | `streaming_s3_response`, `stored_object_response` |
| `app/utils/avatars.py` | `resolve_avatar_url`, `extract_avatar_s3_key` |
| `app/api/deps.py` | `get_current_user_bearer_or_query` for download/avatar URLs |

---

## Frontend integration

| Utility | Use |
|---------|-----|
| `src/utils/files.ts` → `uploadFile()` | Multipart POST via shared API client |
| `src/utils/download.ts` → `downloadFromApi()` | Authenticated blob download + save |
| `src/utils/assetUrl.ts` → `assetUrl()` | Append `access_token` for `<img>` / PrimeVue `Avatar` |

The API client (`src/api/client.ts`) strips `Content-Type` on `FormData` requests so the browser sets the multipart boundary correctly.

### Example: ticket attachment

```ts
import { uploadAttachment } from '@/api/attachments'
import { downloadFromApi } from '@/utils/download'

await uploadAttachment(ticketId, file)
await downloadFromApi(`/attachments/${attachmentId}/download`, filename)
```

### Example: avatar in template

```vue
<Avatar :image="assetUrl(user.avatar_url)" />
```

---

## Operations

- **nginx:** `client_max_body_size 100M` (dev + prod configs) to allow large uploads.
- **MinIO in compose:** Required for API/celery; bucket created by `createbuckets` service.
- **Production:** Set strong `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`; keep MinIO on the Docker network only.

---

## Future: response caching

Candidate placement (not implemented yet):

1. **API layer:** Cache `(s3_key → bytes)` in Redis with TTL after auth check.
2. **nginx:** `proxy_cache` on `GET /api/v1/attachments/*/download` with cache key including user/session (careful with auth).

The current streaming design keeps this optional without client changes.

---

## Migration from presigned URLs

Older docs and deployments used presigned MinIO URLs (`upload_url` / `download_url`). That flow is **removed**. After deploy:

- Rebuild **frontend** and **API** together.
- Existing DB rows and S3 objects remain valid (`s3_key` unchanged).
- Legacy `avatar_url` values pointing at `http://minio:9000/...` are mapped to API avatar URLs automatically.
