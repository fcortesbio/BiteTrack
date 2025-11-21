# Script Reference

Two script suites exist in the repo: infrastructure automation under `infrastructure/scripts/` and API-specific helpers under `services/api/scripts/`. This guide summarizes when to use each file and how they interact.

## Infrastructure Scripts (`infrastructure/scripts`)

| Script                                              | Purpose                                                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init.sh`                                           | Interactive setup wizard run via `npm run init`. Cleans Docker, collects credentials, calls other scripts in sequence, and summarizes next steps.               |
| `check-dev-env.sh`                                  | Pre-flight check executed by `services/api` before `npm run dev`. Verifies `.env.development` and that MongoDB is reachable on `localhost:27017`.               |
| `setup-env.sh`                                      | Generates `.env.development`, `.env.production`, `.secrets`, and the `infrastructure/.env` symlink. Handles credential prompting, validation, and URL encoding. |
| `setup-keyfile.sh`                                  | Creates or validates the MongoDB keyfile needed for replica-set auth. Called by `init.sh` before containers start.                                              |
| `start-containers.sh`                               | Wraps `docker compose` commands with logging/health checks; invoked from `init.sh` after env + keyfile exist.                                                   |
| `create-superadmin.sh`                              | Calls `services/api/create-superadmin.js` to seed the platform’s initial credentials.                                                                           |
| `quick-start.sh`                                    | Non-interactive path that assumes env files already exist and simply spins up the Docker stack.                                                                 |
| `test-docker-setup.sh`, `test-env-symlink.sh`, etc. | Self-check utilities used during development of the infrastructure stack. Run them manually if you suspect symlink or Docker issues.                            |

All scripts assume they are executed from the repo root (either directly or via `npm run ...`). They enforce ASCII-only logging for compatibility with minimal shells.

## API Scripts (`services/api/scripts`)

These tasks are focused on backend data seeding, validation, and diagnostics. Run them from `services/api/scripts` unless noted otherwise.

| Script                                                        | Purpose                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `00-init-production-setup.sh`                                 | Bootstraps the API for production deployments (env checks, dependency installs, migrations).                |
| `01-setup-keyfile.sh`                                         | API-specific variant used during standalone deployments where the infrastructure scripts are not available. |
| `02-quick-persistence-test.sh`                                | Smoke test that writes/reads basic documents to ensure Mongo persistence works.                             |
| `03-create-superadmin.sh`                                     | Shell wrapper that calls `../create-superadmin.js` inside the service container or workspace.               |
| `04-populate-test-data.js`                                    | Seeds the database with fixtures stored in `services/api/test-data/`.                                       |
| `05-test-data-persistence.sh`                                 | Verifies seeded data survived restarts.                                                                     |
| `06-test-sales-filtering.js`, `07-test-reporting-features.js` | Targeted scripts that exercise specific analytics endpoints without running the full Jest suite.            |
| `init-noninteractive.sh`                                      | Prepares env files without prompts (consume `init-example.env`), useful for CI.                             |
| `test-api-endpoints.sh`                                       | Curl-based smoke tests for core routes.                                                                     |
| `test-credentials-fix.sh`                                     | Regression script ensuring credential recovery flows stay intact.                                           |
| `test-env-symlink.sh`                                         | Confirms the API sees the correct `.env` file when running under various tooling.                           |

Shared helpers live in `services/api/scripts/lib/` (for example, `env-loader.sh` centralizes environment discovery). When inventing new operational workflows, add them here instead of scattering scripts across the repo, document them in this file, and migrate any superseded instructions into `legacy-docs/services/api/scripts/`.
