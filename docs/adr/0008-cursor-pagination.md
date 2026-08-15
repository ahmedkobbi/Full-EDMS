# ADR-0008: Use cursor-based pagination (not offset)

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §14.3 (Pagination Contract), §22.1 (Backend Performance)

## Context

All list endpoints need pagination. Two common approaches: offset-based (`?page=2&limit=20`) and cursor-based (`?cursor=abc123&limit=20`).

## Decision

Use **cursor-based pagination** on all list endpoints.

- `limit`: max 100 (enforced server-side)
- `cursor`: opaque string (typically the last item's ID, base64-encoded)
- `sort`: whitelisted fields only
- `order`: `asc` / `desc`

## Consequences

### Positive

- Stable results under concurrent writes (no row shifting)
- O(limit) performance regardless of page depth (offset is O(limit × page))
- No "last page" count needed (cursor is null when done)
- Works with keyset pagination on indexed columns (fast)

### Negative

- Cannot jump to an arbitrary page (must walk forward)
- Slightly more complex client logic (store cursor, not page number)
- Total count requires a separate query (we return it alongside)

## Alternatives Considered

- **Offset pagination**: simpler but O(n²) for deep pages; unstable under writes; "page 5" changes if rows are added
- **Infinite scroll**: UX choice, not pagination strategy — can be built on top of cursor pagination

## Spec Reference

§14.3: "cursor-based pagination for large datasets." §22.1: "cursor-based pagination for large datasets."
