"use strict";
/**
 * @smart-edms/ai-core — secure AI context envelope builder (spec §11.7).
 *
 * The AI Gateway provides the planner with a "secure context envelope" —
 * a small, typed payload describing who the user is, what they can do, and
 * what licensed modules are active. The envelope is the ONLY user/tenant
 * state the planner is allowed to read.
 *
 * CRITICAL (spec §11.7): the envelope MUST NOT include:
 *  - JWT tokens, session tokens, API keys, or any bearer secret;
 *  - password hashes, MFA secrets, or recovery codes;
 *  - private keys (license signing keys, JWT signing keys, etc.);
 *  - full database credentials (DSNs, connection strings);
 *  - unrestricted permission bypass ("act as admin" flags).
 *
 * The builder takes typed inputs and constructs ONLY the allow-listed
 * fields, so even if the caller passes an object containing secrets, those
 * secrets are never copied into the envelope.
 *
 * Spec ref: §11.7 (secure context envelope), §11.10 (data minimization),
 * §11.13 (data residency — the envelope never crosses tenant boundaries).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextEnvelope = buildContextEnvelope;
exports.isContextEnvelope = isContextEnvelope;
/**
 * Build a secure {@link AiContextEnvelope} from typed inputs (spec §11.7).
 *
 * The returned object contains ONLY the allow-listed fields:
 *  - `userId`, `tenantId`, `roles`, `permissionsSummary`, `locale`,
 *    `timezone`, `licensedModules`, `currentRoute`, `requestId`, `theme`,
 *    `tourContext`.
 *
 * It NEVER includes:
 *  - JWT tokens, session tokens, API keys, bearer secrets;
 *  - password hashes, MFA secrets, recovery codes;
 *  - private keys (license signing, JWT signing, etc.);
 *  - full database credentials;
 *  - any "act as admin" / unrestricted-permission bypass.
 *
 * The builder is intentionally explicit: even if the caller's `user`
 * object has extra fields, they are NOT copied across — only the fields
 * named in {@link ContextEnvelopeUser} are read.
 */
function buildContextEnvelope(input) {
    // Defensive: callers might pass an `unknown` cast; we re-construct from
    // named fields only, so extra fields are silently dropped.
    return {
        userId: input.user.id,
        tenantId: input.tenant.id,
        roles: Object.freeze([...input.user.roles]),
        permissionsSummary: Object.freeze([...input.user.permissionsSummary]),
        locale: input.user.locale,
        timezone: input.user.timezone,
        licensedModules: Object.freeze([...input.license.licensedModules]),
        currentRoute: input.tenant.currentRoute,
        requestId: input.requestId,
        theme: input.theme,
        tourContext: Object.freeze((input.tourContext ?? []).map((t) => ({
            tourId: t.tourId,
            status: t.status,
        }))),
    };
}
/**
 * Defensive runtime check: returns `true` iff `env` looks like a valid
 * `AiContextEnvelope` (i.e. it has all the required fields with the right
 * types). Useful at the planner boundary to reject malformed envelopes.
 *
 * Does NOT validate field VALUES (e.g. that `userId` is a real UUID) —
 * only that the structural shape is correct.
 */
function isContextEnvelope(env) {
    if (env === null || typeof env !== 'object')
        return false;
    const e = env;
    return (typeof e.userId === 'string' &&
        typeof e.tenantId === 'string' &&
        Array.isArray(e.roles) &&
        Array.isArray(e.permissionsSummary) &&
        typeof e.locale === 'string' &&
        typeof e.timezone === 'string' &&
        Array.isArray(e.licensedModules) &&
        typeof e.currentRoute === 'string' &&
        typeof e.requestId === 'string' &&
        (e.theme === 'light' || e.theme === 'dark') &&
        Array.isArray(e.tourContext));
}
//# sourceMappingURL=context-envelope.js.map