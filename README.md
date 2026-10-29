# cms-drupal

Vercel's [Drupal Marketing Site](https://vercel.com/templates/next.js/drupal-nextjs-marketing-site)
— next-drupal's [`example-marketing`](https://github.com/chapter-three/next-drupal/tree/main/examples/example-marketing):
a Next.js marketing site read from a headless Drupal over JSON:API, with
landing pages built from Drupal paragraphs (hero, feature, cards, FAQ, a
view), a blog two to a page, a properties listing with a filterable view,
Drupal's menus, English and Spanish, on-demand revalidation when an editor
saves and Drupal's preview links for drafts — running on **Cloudflare
Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with every
rendered page in an **R2 bucket** provisioned by Terraform through
[Orun](https://github.com/sourceplane/orun), deployed by
[Orun](https://github.com/sourceplane/orun) to stage and prod on every merge.
Packaging it as an Orun baseline is the next milestone (DR2).

A fresh build needs no Drupal site: until its owner connects one, every page
renders from a bundled sample Drupal (the template's own content model:
landing pages from paragraphs, articles, a basic page, twelve property
listings, two menus, both languages) under a "No Drupal site is connected"
notice — never a 500. The owner connects Drupal by setting its URL (and the
OAuth client preview reads drafts with, and the revalidation secret) as Orun
secrets and redeploying. The Worker is about 1.3 MiB gzipped, inside Workers
Free's 3 MiB. See [`specs/epics/cms-drupal`](specs/epics/cms-drupal/README.md)
for the design, the milestones and the as-built status.

## What is here (the product)

| Surface | Where |
|---|---|
| The pages: one catch-all route Drupal's decoupled router resolves (`/`, `/about`, `/properties`, every article, `/es/…`), the blog listing, and the routes Drupal calls — `/api/revalidate`, `/api/preview`, `/api/exit-preview` — plus `/api/health` | `apps/web/pages` |
| The site's name | `apps/web/site.ts` (`SITE_NAME`) |
| The Drupal client, and what it reads before a Drupal site is connected | `apps/web/lib/drupal.ts`, `apps/web/lib/sample-drupal.mjs` (served to the browser's properties search by `pages/api/sample-drupal`) |
| The template's components (paragraphs, nodes, the properties view, menus, the locale switcher) | `apps/web/components` |
| Workers build, cache binding and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ the committed `wrangler.jsonc`), `component.yaml` |
| The R2 bucket (stage, prod) | `infra/terraform/cloudflare-r2` |
| The wrangler renderer, and the step that puts the OAuth client and the revalidation secret on the Worker | `tooling/wire` |
| Tests | `tests/web` (the sample Drupal through next-drupal itself, a connected Drupal over HTTP — `fake-drupal.mjs`, the stand-in the e2e also runs — the two routes Drupal calls, the name seam, the multi-site filter) |

## Getting started

```bash
pnpm install
pnpm run wire:fixture   # render apps/web/wrangler.jsonc from the offline fixture
pnpm typecheck
pnpm lint
pnpm test
pnpm build              # next build + opennextjs-cloudflare build → apps/web/.open-next
```

```bash
pnpm --filter @app/web dev        # http://localhost:3001, Next's dev server
pnpm --filter @app/web preview    # wrangler dev over the built Worker and a local R2 bucket
```

With no `DRUPAL_BASE_URL` both serve the sample Drupal. To run against a
Drupal site, put its settings in `apps/web/.env.local` (from
`apps/web/.env.example`). Offline, the stand-in Drupal the tests use answers
the site's calls with the same sample content over HTTP, plus OAuth, preview
validation and drafts:
`node tests/web/fake-drupal.mjs --port 4040 --client c --client-secret s --preview-secret p`,
then `DRUPAL_BASE_URL=http://127.0.0.1:4040` for the build and
`DRUPAL_CLIENT_ID=c DRUPAL_CLIENT_SECRET=s DRUPAL_REVALIDATE_SECRET=r` in
`apps/web/.dev.vars`.

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js hosting (Pages Router SSG, API routes, i18n routing) | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets (`ASSETS`) |
| `getStaticPaths` with `fallback: "blocking"` | The same: every path Drupal lists is pre-rendered at build; a path Drupal adds later renders on its first visit and is kept |
| ISR cache | The R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET`, keyed by build |
| `res.revalidate(path)` in `/api/revalidate` | The same route; OpenNext sends Next's self-request through the Worker's `WORKER_SELF_REFERENCE` service binding (a Worker cannot fetch its own workers.dev hostname) |
| Preview mode (`drupal.preview`, `setPreviewData`) | The same, unchanged: Drupal's `next` module validates the link's secret and the draft is read with the OAuth client's token |
| Image Optimization | Off (`images.unoptimized`): images come from Drupal's files |
| `NEXT_PUBLIC_DRUPAL_BASE_URL`, `DRUPAL_SITE_ID` | Orun secrets `DRUPAL_BASE_URL` and `DRUPAL_SITE_ID` (optional build env) — and, with no URL, the bundled sample Drupal instead of a build that cannot fetch |
| `DRUPAL_CLIENT_ID`, `DRUPAL_CLIENT_SECRET`, `DRUPAL_REVALIDATE_SECRET` | Orun secrets each deploy puts on the Worker; the build never sees them. Without the client preview cannot read drafts; without the secret `/api/revalidate` refuses every call |
| `NEXT_PUBLIC_BASE_URL` | Each environment's `SITE_URL`, else its workers.dev URL, set by the build as `NEXT_PUBLIC_SITE_URL` |
| Deploy on push | Orun applies the bucket and deploys `<repo>-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |
| "Deploy with Vercel" (clone the template) | `orun new --blueprint repo-blueprint.yaml` — a new repository, branded, deployed |

The port moved the Next 12-era template to Next 16.3.8 (React 19, next-drupal
2.0.1, TanStack Query 5, the current `next/link` and `next/image`); the epic's
[IMPLEMENTATION-STATUS](specs/epics/cms-drupal/IMPLEMENTATION-STATUS.md) lists
every departure.

## How the bucket reaches the Worker

```
infra/terraform/cloudflare-r2 ──apply (r2-data token)──► orun secret WIRING_CLOUDFLARE_R2 (stage, prod)
                                               │   (each deploy resolves it as it starts;
                                               │    a missing one fails the lane)
                                               ▼
apps/web  dependsOn cloudflare-r2 (enforced on main) · secretEnv WIRING_CLOUDFLARE_R2_<ENV>
  build:  tooling/wire/live.mjs → wrangler.jsonc with the environment's bucket name
          (dev, verify-only, renders the fixture) → next build → opennextjs-cloudflare
          → tooling/wire/worker-secrets.mjs puts DRUPAL_CLIENT_ID, DRUPAL_CLIENT_SECRET,
            DRUPAL_REVALIDATE_SECRET on the Worker
  deploy: workers-deploy token → <repo>-web-<env>, bound to its bucket and to itself
```

`wrangler.jsonc` is committed as the fixture render of
`wrangler.template.jsonc`, because the deploy lane's `verify-app-structure`
step checks the config exists before it builds; `testing/e2e.test.sh` fails
if the two disagree.

## CI

| Workflow | What it runs | Ships to a product |
|---|---|---|
| `ci.yml` | the Orun pipeline, and the only workflow a product carries: `orun plan --changed`, then one job per lane. A pull request runs the verify lanes (the R2 root planned for stage and prod, the site built and dry-deployed per environment; they neither lint nor run the tests, which `baseline.yml`'s e2e tier runs before every tag), except the bootstrap's own landings (`orun/BASE-*`), where `plan` alone runs and nothing waits for it (the landing checked its commit in the box); a merge applies the R2 bucket, then deploys stage → prod. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does. A manual run (Orunbase's Deploy button, or Run workflow on `main`) plans the environment and components it names under the push-to-main trigger, so they deploy as a merge deploys them | yes |
