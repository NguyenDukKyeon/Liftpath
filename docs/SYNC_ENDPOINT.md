# LiftPath 3.0 — Remote JSON Sync Contract

LiftPath remains local-first. Cloud sync is optional and works with any HTTPS endpoint that stores one JSON document per user.

## Request contract

### Push

```http
PUT /your-endpoint
Content-Type: application/json
Authorization: Bearer <optional token>

<SyncEnvelope JSON>
```

The endpoint should replace the user's previous document and return any `2xx` response.

### Pull

```http
GET /your-endpoint
Authorization: Bearer <optional token>
```

Return the same `SyncEnvelope` JSON. Return `404` when no backup exists.

## Security requirements

- Use HTTPS only.
- Authenticate every user-specific endpoint.
- Do not log bearer tokens or workout payloads.
- Enforce a reasonable payload limit, for example 10 MB.
- Store the document encrypted at rest when possible.
- Validate that `app === "liftpath"` and `schemaVersion === 3`.
- Use a unique endpoint or user identity for each account.

## Conflict strategy

The current UI uses explicit Push and Pull actions to avoid silent overwrite. `updatedAt` is included for future automatic conflict resolution. A production backend should support ETag or revision identifiers before enabling unattended two-way sync.

## Scope of version 3.0

Version 3.0 provides a real endpoint adapter and sync UI, but does not ship a hosted LiftPath account service. This keeps the app deployable as a static PWA and prevents a mandatory cloud dependency.
