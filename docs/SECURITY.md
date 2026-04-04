# ATLAS security notes

## Threat model (summary)

- **Authenticated users** are the primary threat for IDOR and abuse (quizzes, live quizzes, session analytics, leaderboard adjustments).
- **Network attackers** target JWTs (especially in cookies/localStorage), unauthenticated endpoints, and SSRF via server-side URL fetches.
- **Operators** must protect secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`), disable public API docs in production unless explicitly enabled, and align frontend middleware with `JWT_SECRET` for verified cookie gates.

## Controls implemented in this codebase

- Live quiz REST/WebSocket: identity from JWT; facilitator checks; participant binding for answers; correct answers stripped from participant-facing REST and broadcast events.
- Session analytics: cohort/session scoped access; exports require the same checks.
- Standard quizzes: cohort/session assignment enforced for get/submit/review flows.
- Account state: suspended users blocked at login, refresh, `validateUser`, and WebSocket connect; forced password change enforced in `JwtAuthGuard` except for profile and change-password routes.
- Next.js middleware verifies access cookies with `jose` when `JWT_SECRET` is set.
- Production: `JWT_REFRESH_SECRET` required; Swagger only if `SWAGGER_ENABLED=true`.
- Discussion resource fetch: HTTPS only; blocks common private/loopback literal hosts.
- Welcome email: no plaintext passwords; admins must share temporary passwords out of band.

## Operational checklist

1. Set strong, distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.
2. Set `JWT_SECRET` on the Next.js server so middleware can verify cookies.
3. Keep `SWAGGER_ENABLED` unset/false in production unless the docs endpoint is intentionally public.
4. Plan Redis-backed rate limiting if you run more than one API replica.
