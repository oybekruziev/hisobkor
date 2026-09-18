# Cloudflare backend

The production API runs from `worker/index.mjs`. It requires four bindings: D1 as `DB`, private R2 as `DOCUMENTS`, static assets as `ASSETS`, and Workflows as `DOCUMENT_REVIEW`. `OPENAI_API_KEY` must be a Wrangler secret. `OPENAI_MODEL` defaults to `gpt-5.6-luna`.

## Initialize

Apply all migrations in `migrations/` to D1 before sending traffic. The worker fails closed with HTTP 503 when the schema or a required binding is missing.

Users can create an account at `https://app.hisobkor.uz/#register`. `POST /api/register` accepts `username`, `password`, and `confirmPassword`. Usernames are normalized to lowercase (3–40 ASCII letters, digits, dots, hyphens or underscores, starting with a letter or digit); passwords require 12–128 characters. Registration has a separate five-attempt/IP/15-minute D1 limit and requires the same origin/header checks as login. The account, empty private workspace and initial session are created in one D1 transaction. Duplicate usernames return 409 without overwriting an account. Successful registration opens profile onboarding. Email verification and email password recovery are not enabled.

Offline provisioning remains available for administrative use:

```sh
MEZON_BOOTSTRAP_PASSWORD='a-long-random-password' node worker/admin-seed.mjs owner@example.uz > /tmp/mezon-account.sql
npx wrangler d1 execute hisobkor-production --remote --file /tmp/mezon-account.sql
rm /tmp/mezon-account.sql
```

The generated SQL contains the PBKDF2 hash, a random account ID, and a random workspace ID. It does not contain the password. Delete the temporary SQL after applying it.

Passwords use PBKDF2-HMAC-SHA-256 with a random 128-bit salt and 100,000 iterations. This is Cloudflare Workerd's current WebCrypto maximum, but it is lower than current general-purpose password-hashing guidance. Use long generated passwords, keep the five-attempt distributed login limit enabled, and revisit the KDF when Workerd raises the cap or adds a suitable memory-hard WebCrypto KDF.

Set the managed OpenAI secret without placing it in configuration or logs:

```sh
npx wrangler secret put OPENAI_API_KEY
```

## Data boundaries

Every workspace, file-version, and AI-job query includes both account and workspace IDs from the hashed server session. R2 keys also include those IDs. Uploaded objects are private and immutable: retrying the same bytes under one logical ID is idempotent, while different bytes require a new logical ID. The UI already creates a new `fileKey` for a replacement. A workflow checks the current version before and after the paid model call, so an old result is never published for a replacement file.

Workspace JSON is limited to 1 MiB. Files are limited to 25 MiB and accepted only when their MIME type and leading signature agree. AI is capped per account by `AI_MAX_ACTIVE_PER_ACCOUNT` (default 2) and `AI_MAX_DAILY_PER_ACCOUNT` (default 40). `POST /api/ai/analyze` accepts optional `force: true` to rerun a completed or failed current version; a queued or processing job is always reused. Completed analysis is stored on the job, then overlaid on the matching document during workspace reads. It is never written into workspace JSON, so workflow completion cannot cause a workspace revision conflict.

Mutating requests require `APP_ORIGIN` exactly and `X-Mezon-Request: 1`. Production accepts that application host (default `https://app.hisobkor.uz`); localhost is accepted only when `ENVIRONMENT=local`. Static serving is an allowlist. `SITE_ORIGIN` (default `https://hisobkor.uz`) serves the landing HTML, stylesheet, and favicon only.

Run the backend contract tests without network or paid API calls:

```sh
node --test tests/cloud*.test.mjs tests/registration.test.mjs
```
