# BiteTrack Delivery Roadmap

This document translates the current architecture state into a practical delivery plan. Each phase can become a GitHub Project view or a Trello board column, with the “Now / Next / Later” tags helping prioritize work.

## Milestone Overview

| Phase | Focus                          | Rough Outcome                                                      |
| ----- | ------------------------------ | ------------------------------------------------------------------ |
| P1    | Stabilize core services        | API feature completeness, frontend MVP, MCP baseline               |
| P2    | Developer experience & quality | Repeatable setup, automated testing, actionable telemetry          |
| P3    | Product features               | Business-facing dashboards, advanced API features, AI assistant UX |
| P4    | Deployment & scaling           | Secure infra, backups, CI/CD, performance tuning                   |
| P5    | Documentation & launch         | Polished docs, change log, UAT sign-off                            |

## Phase 1 – Stabilize Core Services (Now)

**API Hardening**

- Close Swagger coverage gaps; ensure `/api/v2/docs` reflects every new route.
- Build regression tests for replica-set initialization and authentication fallbacks.
- Improve `.env` validation and rate-limit/JWT default handling.

**Frontend MVP**

- Replace the health-only React shell with the first authenticated flows (login, sales list, basic analytics cards).
- Introduce routing/state management (React Router + query caching) to support future dashboards.
- Add CI smoke test (Vite build + Playwright stub) to prevent regressions.

**MCP Polish**

- Expand the `services/mcp/tools` catalog (auth helpers, reporting queries, inventory adjustments).
- Add telemetry/quotas to `CodeExecutor` (execution count, timeout overrides, logging).
- Document secure deployment practices for `API_URL`, `JWT_SECRET`, and optional Gemini key.

## Phase 2 – Developer Experience & Quality (Next)

**Automation Scripts**

- Deduplicate overlapping scripts (infra vs. service) and improve error messaging for replica-set auth failure.
- Provide noninteractive paths for CI (pre-seeded `.env` configs, dry runs).

**Testing Targets**

- API: keep Jest integration/performance tests green; add contract tests for MCP tool interactions.
- Frontend: add component/unit tests plus an e2e smoke path covering login → dashboard.
- MCP: create sandbox tests that simulate untrusted scripts, ensuring rate limits and cleanup logic.

**Observability**

- Introduce structured logging (pino/winston) with correlation IDs.
- Wire optional tracing/metrics via OpenTelemetry exporters and Traefik access logs.

## Phase 3 – Product Features (Later)

**Dashboard Experience**

- Role-based navigation (admin, seller manager, analyst).
- Widgets for sales, inventory drops, customer KPIs, and alerts.
- CSV/Excel export + filtered views for compliance.

**API Enhancements**

- Audit logging for sensitive actions, bulk operations, improvements to CSV import/export with validation.
- Reporting improvements (custom ranges, comparison periods, caching).

**MCP Assistant**

- Guided workflows (“analyze weekly waste”, “prepare test data”) exposed via UI and CLI.
- Token-scoped permissions per session and improved session lifecycle management.

## Phase 4 – Deployment & Scaling

- Harden Traefik: TLS, ACME/Let’s Encrypt, disable insecure dashboard by default.
- Add GitHub Actions pipelines (lint/test/build, Docker push, deploy).
- Automate Mongo backups and retention, define restoration drills.
- Load testing + index tuning; consider caching layers for high-read analytics endpoints.

## Phase 5 – Documentation & Launch

- Keep `docs/` as the canonical source (update per milestone, archive superseded notes in `legacy-docs/`).
- Publish a changelog plus onboarding/runbooks (operators, developers, support).
- Conduct UAT using the Docker stack, collect sign-offs, and tag the launch release.

## Using This Roadmap

- **GitHub Projects**: create swimlanes per phase, use labels (`phase::p1`, `area::frontend`) to filter views; add an iteration field for sprints.
- **Trello**: columns = phases; cards reference tasks above, with checklists for subtasks (e.g., “Swagger coverage” with per-route boxes).
- Review roadmap monthly: move completed cards to `Done` and shift upcoming work into the `Now` column to keep the board actionable.
