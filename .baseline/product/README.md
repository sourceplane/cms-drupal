# cms-drupal

A Drupal-powered marketing site — landing pages built from Drupal paragraphs
(hero, feature, cards, FAQ, a view), a blog, a properties listing with a
filterable view, Drupal's menus, English and Spanish — on **Cloudflare
Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), built from
Vercel's [Drupal Marketing Site](https://vercel.com/templates/next.js/drupal-nextjs-marketing-site)
template, next-drupal's `example-marketing` (MIT — `apps/web/LICENSE`). It
reads your Drupal site over JSON:API with [next-drupal](https://next-drupal.org).
Every page is pre-rendered and kept in an **R2 bucket** that Terraform
provisions per environment, and re-rendered the moment Drupal says it changed;
Drupal's preview links open drafts on the site itself.

It is live from its first deploy, before any Drupal site is connected: every
page renders from a bundled sample Drupal — the template's content model with
sample words and photos — under a **"No Drupal site is connected"** notice.
Once you give the build your Drupal's URL, it renders yours.

## Live deployment

<!-- 02-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace, whether a Drupal site is connected and the secrets the site
uses into [ai/context/deployment.md](ai/context/deployment.md); how the site
deploys and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 02-docs:end -->

## What is here

| Surface | Where |
|---|---|
| The pages: one catch-all route (`pages/[[...slug]].tsx`) for every path Drupal's decoupled router resolves — `/` (Drupal's `/home`), `/about`, `/properties`, every article, and `/es/…` — and the blog listing (`/blog`, two to a page) | `apps/web/pages` |
| The routes Drupal calls: `/api/revalidate` (on-demand revalidation), `/api/preview` and `/api/exit-preview`; and `/api/health` | `apps/web/pages/api` |
| The site's name | `apps/web/site.ts` (`SITE_NAME`) |
| The Drupal client (next-drupal), and the sample Drupal it reads until one is connected | `apps/web/lib/drupal.ts`, `apps/web/lib/sample-drupal.mjs` |
| The template's components: paragraphs, nodes, media, the properties view, menus, the locale switcher | `apps/web/components` |
| Workers build, cache binding and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ `wrangler.jsonc`), `component.yaml` |
| The R2 bucket (stage, prod) | `infra/terraform/cloudflare-r2` |
| Tests | `tests/web` (vitest), with a stand-in Drupal (`tests/web/fake-drupal.mjs`) for the connected path |

## Getting started

```bash
pnpm install
pnpm run wire:fixture   # render apps/web/wrangler.jsonc from the offline fixture
pnpm typecheck
pnpm lint
pnpm test
pnpm build              # next build + opennextjs-cloudflare build → apps/web/.open-next
```

None of these needs a Drupal site: with none the build is the sample site. To
work against yours, copy `apps/web/.env.example` to `apps/web/.env.local` and
set `DRUPAL_BASE_URL` (and the rest, for preview and revalidation), then:

```bash
pnpm --filter @app/web dev        # http://localhost:3001, Next's dev server
pnpm --filter @app/web preview    # wrangler dev over the built Worker and a local R2 bucket
```

## Connecting Drupal

1. **A Drupal site the template can read.** Drupal 10 or 11 with the
   [Next.js module](https://www.drupal.org/project/next) (`next`, `next_jsonapi`)
   and what it brings — JSON:API, [Decoupled Router](https://www.drupal.org/project/decoupled_router),
   [Simple OAuth](https://www.drupal.org/project/simple_oauth) — plus
   [JSON:API Menu Items](https://www.drupal.org/project/jsonapi_menu_items) and
   [JSON:API Views](https://www.drupal.org/project/jsonapi_views), and the
   template's content model: the `landing_page`, `page`, `article` and
   `property_listing` content types, the `hero`, `feature`, `cards`, `faq` and
   `view` paragraphs, and the `properties` view (next-drupal's repository
   ships that model as configuration, in its `drupal/` directory). Pages are
   found by path alias: the front page is the node at `/home`.
2. **Give the build your Drupal**, once per deployed environment. The build
   pre-renders every page Drupal lists, so its URL is one of this
   repository's Orun secrets, and stage and prod can each read their own site:

   ```bash
   orun secrets set DRUPAL_BASE_URL --env stage    # https://cms.example.com — prompts for the value
   orun secrets set DRUPAL_SITE_ID --env stage     # only for a Drupal that serves several sites (field_site)
   ```

   and the same with `--env prod`. Then **redeploy the site**: a secret is
   read when the site deploys, and setting one deploys nothing. Use **Deploy
   by hand** below, or change the stamp on the last line of
   `apps/web/component.yaml` (`# orun: redeploy …`) and merge. From that
   deploy on the pages are yours.
3. **Let Drupal refresh the pages** (recommended). Every page is kept until
   Drupal says it changed. In Drupal, add a **Next.js site**
   (Configuration → Web services → Next.js sites) with this environment's URL,
   a **revalidate URL** of `https://cms-drupal-web-prod.your-workers-subdomain.workers.dev/api/revalidate`
   and a long random **revalidate secret**, and turn on revalidation for the
   content types (Next.js entity types → revalidator *Path*). Give the site
   the same secret:

   ```bash
   orun secrets set DRUPAL_REVALIDATE_SECRET --env prod
   ```

   and redeploy: the deploy hands it to the Worker as a secret (the build
   never sees it). From then on a save in Drupal calls
   `/api/revalidate?path=<the node's path>&secret=…`, and the next visitor
   gets the new page. A wrong or missing secret is refused (401), and until the
   secret is set every call is.
4. **Preview drafts** (optional). In Drupal, create an OAuth **consumer**
   (Simple OAuth) whose role can view unpublished content and revisions, and
   set the Next.js site's **preview URL** to
   `https://cms-drupal-web-prod.your-workers-subdomain.workers.dev/api/preview` with a
   **preview secret** (Drupal keeps it and validates every preview link).
   Give the site the consumer:

   ```bash
   orun secrets set DRUPAL_CLIENT_ID --env prod
   orun secrets set DRUPAL_CLIENT_SECRET --env prod
   ```

   and redeploy. Drupal's preview then opens the draft revision on the site
   (never cached); `/api/exit-preview` leaves preview.

## How the cache is wired

Every page is rendered from Drupal once — at build for every path Drupal
lists, on first visit for a path it adds later (`fallback: "blocking"`) — and
kept in the bucket the Worker binds as `NEXT_INC_CACHE_R2_BUCKET`. Entries are
keyed by build, so a deploy starts from fresh pages. `/api/revalidate` calls
Next's `res.revalidate(path)`, which renders the page again by requesting it
from the Worker itself — through the `WORKER_SELF_REFERENCE` service binding,
because a Worker cannot fetch its own workers.dev hostname — and replaces the
entry. A visitor in preview is never served from the cache.

The bucket's name is never hand-written: `apps/web/wrangler.template.jsonc`
names it as a wiring token, and `wrangler.jsonc` is that template rendered —
from `wiring.fixture.json` for local work and verification, and on every
deploy from the document the `cloudflare-r2` Terraform root publishes after
its apply (`WIRING_CLOUDFLARE_R2`, per environment). Edit the template, then
`pnpm run wire:fixture` and commit the render with the template.

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. The R2 bucket applies first, then the
site builds for that environment — its bucket, its origin, and its
Drupal site if one is set — and deploys, to `stage`, then to `prod` once
stage has converged on the same commit; `dev` only verifies. The Worker is
`cms-drupal-web-<env>` on your account's workers.dev subdomain, and
every deploy is smoke-tested over HTTP: the home page must render its menu,
`/api/health` must answer (only the Worker can), and `/api/revalidate` must
refuse a call without its secret. A pull request runs the same
pipeline's verify lanes, with nothing applied or deployed: the R2 bucket
planned for stage and prod, and the site built and dry-deployed for
each environment. They do not run the tests or the linter — run those before
you push (Getting started, above). (A push to `main` applies, builds and
deploys.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The Cloudflare
tokens and account id are brokered per run from the workspace's Cloudflare
connection — one to deploy the Worker, one with R2 access for the bucket's
apply — and the bucket names, your Drupal's URL and the three Worker secrets
travel as Orun secrets; nothing provider-shaped is stored in the
repository or in GitHub.

**Deploy by hand.** Orunbase's **Deploy** button on a component, or **Run
workflow** on the CI workflow in GitHub's Actions tab (on `main`), runs
`ci.yml` for the environment and components you pick, and each one deploys
exactly as a merge would deploy it. Leave the component blank to redeploy
every component in that environment, with nothing changed: after setting your
Drupal's URL, say. A component with nothing to run in that
environment (a test suite in `prod`) is left out with a notice.

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js hosting (Pages Router SSG, API routes, i18n routing) | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets (`ASSETS`) |
| `getStaticPaths` with `fallback: "blocking"` | The same; pre-rendered at build, a new path rendered on its first visit and kept |
| ISR cache | The R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET` |
| `res.revalidate(path)` (Drupal's on-demand revalidation) | The same route, re-rendering through the Worker's own `WORKER_SELF_REFERENCE` binding |
| Preview mode | The same, unchanged: Drupal validates the link, the draft is read with the OAuth client |
| Image Optimization (`/_next/image`) | Off (`images.unoptimized`): images come from your Drupal's files |
| `NEXT_PUBLIC_DRUPAL_BASE_URL`, `DRUPAL_SITE_ID` | Orun secrets `DRUPAL_BASE_URL`, `DRUPAL_SITE_ID` (above), read by the build; the sample site until set |
| `DRUPAL_CLIENT_ID`, `DRUPAL_CLIENT_SECRET`, `DRUPAL_REVALIDATE_SECRET` | Orun secrets the deploy puts on the Worker, never in the build |
| `NEXT_PUBLIC_BASE_URL` (canonical and Open Graph links) | Each environment's `SITE_URL` (intent.yaml), else its workers.dev URL — set by the build |
| The navbar's "Marketing", the titles' and the footer's "Next.js for Drupal" | `SITE_NAME` in `apps/web/site.ts` |
| Deploy on push | Orun applies the bucket and deploys `cms-drupal-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain:

1. Add the domain to the Cloudflare account the site deploys into, and attach
   it to the Worker (dashboard → Workers & Pages →
   `cms-drupal-web-prod` → Settings → Domains & Routes → Add →
   Custom domain).
2. Set the environment's public origin in `intent.yaml`, so the next deploy
   builds the site's canonical and Open Graph URLs for it (until
   then they use the workers.dev URL):

   ```yaml
   environments:
     prod:
       env:
         SITE_URL: https://www.example.com
   ```

   The site was born with the reserved placeholder
   `cms-drupal.example.com` where its domain goes: `BASE_DOMAIN` under
   each environment in `intent.yaml`. Replace it with your domain in the same
   change, and land it with a change under `apps/web` so the merge rebuilds
   the site. Point Drupal's `next` site entity (its base URL, preview and revalidation URLs) at the new domain too.

## Licence

The site is Vercel's Drupal Marketing Site template, next-drupal's
`example-marketing` by Chapter Three, under the MIT licence
(`apps/web/LICENSE`). The sample photos are Payload's (MIT,
`apps/web/public/sample/LICENSE.md`).
