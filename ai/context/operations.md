# cms-drupal — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, whether a Drupal site is connected,
the secrets it uses) live in [deployment.md](deployment.md), rendered from
probed reality by the bootstrap's `02-docs` phase; this file is the contract
that stays true between deployments. It is written to give an agent with
repository read access enough context to reason about and operate the site
without any other source.

## What this system is

A Drupal-powered marketing site on Cloudflare, expressed as an Orun
component-native desired-state repo. Drupal itself — the content, its
editors, its revisions — is the owner's site, read over JSON:API (with the
decoupled router, the menu and views endpoints) through next-drupal; nothing
here runs Drupal.

- **`infra/terraform/cloudflare-r2`** — one R2 bucket per deployed
  environment (`stage`, `prod`), applied by Terraform: the site's Next.js
  incremental cache. After each apply it publishes a wiring document —
  `{r2_bucket_name}` — as the Orun secret `WIRING_CLOUDFLARE_R2` on that
  environment.
- **`apps/web`** — the site: Vercel's Drupal Marketing Site template
  (next-drupal's `example-marketing`, Pages Router, English and Spanish)
  built by `@opennextjs/cloudflare` into one Worker plus Static Assets.
  Every page is pre-rendered from Drupal at build (`getStaticPaths`, every
  path Drupal lists), a path Drupal adds later renders on its first visit
  (`fallback: "blocking"`), and each is kept in the bucket
  (`NEXT_INC_CACHE_R2_BUCKET`) until `/api/revalidate` re-renders it. The
  Worker binds itself (`WORKER_SELF_REFERENCE`) for that re-render. With no
  Drupal connected it reads the bundled sample Drupal (`lib/sample-drupal.mjs`).
- **`tests/web`** — the sample Drupal through next-drupal, a connected
  Drupal over HTTP (`fake-drupal.mjs`, a stand-in), the revalidation and
  preview routes, the name seam and the multi-site filter (vitest). It does
  not run in a lane: the `dev` lane of `tests/web` installs it and checks its
  structure, so run `pnpm typecheck`, `pnpm lint` and `pnpm test` before you
  push.
- **`tooling/*`** — shared TypeScript and ESLint configuration, the wrangler
  renderer that turns `wrangler.template.jsonc` plus a wiring document into
  `wrangler.jsonc`, and the step that puts the OAuth client and the
  revalidation secret on the Worker after its build.

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and dry-deploy, nothing deploys, and
no bucket exists for it (its build renders the committed fixture).

The Worker is about 1.3 MiB gzipped, inside Workers Free's 3 MiB.

## Identity and tenancy

Every remote operation runs against ONE Orun workspace, declared in
`intent.yaml` under `execution.state.workspace` — committed, enforced, and
what CI uses. Do not remove it; headless credentials depend on it. If it
reads `ws_SET_ME`, the bootstrap had no workspace to write: set the real one
before anything else.

## How deployment works

1. Merge (or push) to `main`.
2. CI (`.github/workflows/ci.yml`) runs `orun plan --changed` — only
   components whose files changed are planned — then runs each planned lane
   with `orun run --remote-state`, authenticated by GitHub OIDC (the
   exchange resolves this repository's linked workspace server-side).
3. **The bucket before the Worker.** `cloudflare-r2` applies for the
   environment and publishes `WIRING_CLOUDFLARE_R2`. `apps/web` declares an
   enforced `dependsOn` on it for pushes to `main`, so its deploy starts only
   after that apply — and a job resolves its secrets when it starts, so the
   document is there.
4. `apps/web` renders `wrangler.jsonc` from that document (the real bucket
   name) and builds once per environment: `NEXT_PUBLIC_SITE_URL` is the
   environment's `SITE_URL` (intent.yaml) or its workers.dev URL, and the
   Drupal site is the environment's `DRUPAL_BASE_URL` (and `DRUPAL_SITE_ID`)
   secret, when set — inlined by the build, which pre-renders every page
   Drupal lists. The build runs without `DRUPAL_CLIENT_ID`,
   `DRUPAL_CLIENT_SECRET` and `DRUPAL_REVALIDATE_SECRET`; once it is done,
   `tooling/wire/worker-secrets.mjs` puts those (when set) on
   `cms-drupal-web-<env>`. `wrangler deploy` ships the Worker, and a smoke
   test fetches `/` (its menu), `/api/health` (which only the Worker
   answers) and `/api/revalidate` (refused without the secret).
5. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
6. **The convergence run is the deployment.** A green run means every
   planned lane applied. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

On a pull request nothing applies or deploys: the R2 root plans, the
site builds and dry-deploys, and the edges in step 3 are advisory.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- A change to `intent.yaml`'s `environments` maps to no component and
  redeploys nothing on its own. Land it with a change under `apps/web`.
- Setting or changing any `DRUPAL_*` secret deploys nothing: the URL and
  the site id are read when the site builds, and the three Worker secrets
  are put on the Worker by its deploy. Redeploy it (below).
- A deploy starts from fresh pages (the cache is keyed by build): the first
  visit to each page after a deploy reads Drupal.
- `wrangler.jsonc` is generated. Edit `wrangler.template.jsonc`, run
  `pnpm run wire:fixture` and commit both; the deploy renders its own
  config from the template, so a stale committed render misleads local work.

## The site

- **No Drupal site connected** (`DRUPAL_BASE_URL` unset for the
  environment): next-drupal reads the bundled sample Drupal in the Worker —
  the template's content model (landing pages from paragraphs, three
  articles, a basic page, twelve property listings, two menus, English and
  Spanish) with sample words and photos (`public/sample`) — under a "No
  Drupal site is connected" notice. The browser's properties search reaches
  it at `/api/sample-drupal/…`. `/api/preview` answers 401 (nothing to
  preview); `/api/health` answers `{"ok":true,"connected":false}`.
- **Connected**: every page Drupal's decoupled router resolves (the front
  page is the node at `/home`) renders through the one catch-all route; the
  blog lists `node--article`s two to a page; the properties page's view
  (`properties--listing`) is fetched by the browser from Drupal's own view
  link, so Drupal must allow the site's origin in CORS. Unknown paths 404.
  `/api/health` answers `{"ok":true,"connected":true}`.
- **Revalidation**: Drupal's `next` module calls
  `/api/revalidate?path=<path>&secret=<DRUPAL_REVALIDATE_SECRET>` when a
  node is saved; the route re-renders that path (Drupal's `/home` is `/`)
  and the next visitor gets the new page. A missing or wrong secret is
  refused (401); with no secret set every call is, and pages change only
  with a deploy.
- **Preview**: Drupal's preview link
  (`/api/preview?path=…&resourceVersion=…&plugin=simple_oauth&secret=…`) is
  validated by Drupal (`/next/draft-url`), then turns on Next's preview mode
  (two cookies, `SameSite=None; Secure`) and redirects to the page, which
  reads the draft revision with the OAuth consumer's token and is never
  cached. `/api/exit-preview` clears it.

## Secrets model

- **Brokered provider secrets**: `CLOUDFLARE_API_TOKEN` (the
  `workers-deploy` scope: Workers Scripts and KV Storage write) deploys the
  Worker; `CLOUDFLARE_R2_TOKEN` (the `r2-data` scope: R2 Storage write) is
  what the R2 root's Terraform authenticates with, because the deploy token
  carries no R2; `CLOUDFLARE_ACCOUNT_ID` is the connection fact both bind.
  Minted per run from the workspace's Cloudflare connection — no long-lived
  values at rest, nothing to rotate by hand.
- **Wiring**: `WIRING_CLOUDFLARE_R2` on `stage` and `prod`, written by the R2
  root's apply (lease-published), read by the Worker's build as
  `WIRING_CLOUDFLARE_R2_<ENV>`. It holds the bucket name, not a credential.
- **The site**: `DRUPAL_BASE_URL` and `DRUPAL_SITE_ID` per environment,
  Orun secrets the owner sets (`orun secrets set … --env <env>`), optional —
  read by the build and inlined. Neither is a credential: the URL is public.
- **The Worker's secrets**: `DRUPAL_CLIENT_ID` and `DRUPAL_CLIENT_SECRET`
  (the OAuth consumer preview reads drafts with) and
  `DRUPAL_REVALIDATE_SECRET` per environment, Orun secrets the owner sets,
  optional. The build never sees them (`env -u`); the deploy hands them to
  `wrangler secret bulk` on `cms-drupal-web-<env>`. The preview secret is
  Drupal's: its `next` module keeps it and validates every link.
- Inspect by NAME only: `orun secrets list --org <ws> --project` and
  `--env stage|prod`; `wrangler secret list --name cms-drupal-web-<env>`.
  No tooling in this repository prints a secret value, and no document in
  `ai/context/` may contain one.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md);
# /api/health says whether a Drupal site is connected
curl -s https://cms-drupal-web-stage.your-workers-subdomain.workers.dev/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://cms-drupal-web-prod.your-workers-subdomain.workers.dev/

# the wiring and the site the deploys read, and workspace readiness
orun secrets list --org <ws> --env stage && orun secrets list --org <ws> --env prod
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| change the site | edit `apps/web` (its name: `apps/web/site.ts`), merge |
| connect a Drupal site | the README's "Connecting Drupal": `DRUPAL_BASE_URL` per environment (and `DRUPAL_SITE_ID` on a multi-site Drupal), then redeploy the site |
| let Drupal refresh pages | `DRUPAL_REVALIDATE_SECRET` per environment, redeploy, and a Next.js site in Drupal with this site's `/api/revalidate` URL and the same secret |
| revalidate by hand | `curl "https://<host>/api/revalidate?path=/about&secret=<DRUPAL_REVALIDATE_SECRET>"` |
| preview drafts | `DRUPAL_CLIENT_ID` and `DRUPAL_CLIENT_SECRET` (a Simple OAuth consumer that can read revisions) per environment, redeploy, and the Next.js site's preview URL `/api/preview` in Drupal |
| change what a page reads | the JSON:API includes and fields per content type in `apps/web/lib/get-params.ts`; the components per type in `apps/web/components` |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| deploy by hand | Orunbase's Deploy button, or `gh workflow run ci.yml --ref main -f environment=<env> [-f component=<a,b>]` — the named components (blank: every one) run in that environment as a merge runs them; started off `main` it is refused |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| empty the page cache | redeploy (a build starts from fresh pages), or delete the bucket's `incremental-cache/` objects |
| add a binding (D1, KV, another bucket) | a Terraform root under `infra/terraform/` that publishes `WIRING_<ROOT>`, a token in `wrangler.template.jsonc`, its fixture entry, the root in the build's `--components`, the `WIRING_<ROOT>_<ENV>` secretEnv and an enforced `dependsOn` on it in `apps/web/component.yaml` |
| serve a custom domain | attach it to the Worker in Cloudflare and set `SITE_URL` for the environment in `intent.yaml` (README, "Custom domain"), then replace the placeholder `cms-drupal.example.com` in `intent.yaml`'s `BASE_DOMAIN` with it |
| add a runtime secret | an Orun secret for the build (`optionalSecretEnv` in `apps/web/component.yaml`); for one the Worker reads at request time, also `env -u` it from the build and add a `--secret` to the `worker-secrets.mjs` step |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `02-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 02-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

Structural changes follow the same contract that deployed the site: add a
component under `apps/`, `infra/` or `packages/` with a `component.yaml`,
land it as a pull request, and the convergence run applies it. A new
paragraph or content type is a component in `apps/web/components` (and its
includes in `lib/get-params.ts`); the sample Drupal (`lib/sample-drupal.mjs`)
is only what a fresh site shows, and can be removed once a Drupal is
connected everywhere.
