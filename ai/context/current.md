# cms-drupal — where this repository stands

The entry page for anyone (or any agent) picking this repository up. It is
this repository's own state and does not ship to a site built from it;
the two pages that do are [operations.md](operations.md) and
[deployment.md](deployment.md).

## What it is

Vercel's Drupal Marketing Site template (chapter-three/next-drupal
`examples/example-marketing` — a Next.js Pages Router site read from a
headless Drupal with next-drupal: landing pages from paragraphs, a blog, a
properties view, menus, English and Spanish, on-demand revalidation and
preview) on Cloudflare Workers + Static Assets through
`@opennextjs/cloudflare`, every page in an R2 bucket and re-rendered through
the Worker's own service binding, packaged as an Orun baseline:
`orun new --blueprint repo-blueprint.yaml` builds a new site in its own
repository and takes it to live on stage and prod in one landing
(`01-product`) — the R2 bucket applied before the Worker that binds it — then
records what went live (`02-docs`). With no Drupal connected every page
renders from a bundled sample Drupal under a "No Drupal site is connected"
notice; the owner connects one by setting its URL as an Orun secret (and the
OAuth consumer and the revalidation secret) and redeploying. The Worker is
about 1.3 MiB gzipped, so Workers Free is enough.

## Release

| | |
|---|---|
| Latest tag | `baseline-v1` (DR2) |
| Proven live | No. Everything short of the platform is proven offline in Baseline CI — the site built and served as born (the sample Drupal), then connected to a stand-in Drupal: its cache reused (a second visit reads Drupal not at all), an edit shown only after the secret-checked revalidation (through `WORKER_SELF_REFERENCE`), a draft opened through Drupal's preview link. The tokens minted, a real R2 apply, a real `wrangler deploy`, the probes and a real Drupal site are still to come (risk DR-A) |

## Where to read

| Question | Page |
|---|---|
| What shipped, and every departure from upstream | `specs/epics/cms-drupal/IMPLEMENTATION-STATUS.md` |
| Why it is built this way | [decisions.md](decisions.md), then `specs/epics/cms-drupal/design.md` |
| What could still go wrong | [open-risks.md](open-risks.md), then `specs/epics/cms-drupal/risks-and-open-questions.md` |
| The spike that proved the router, ISR and preview on Workers | `specs/epics/cms-drupal/design.md` §4 |
| How to instantiate it | `BOOTSTRAP.md`, `docs/phases/` |
| What each component is | `apps/web/docs/`, `infra/terraform/cloudflare-r2/docs/`, `tests/web/docs/` (generated; `python3 tooling/catalog/gen-component-docs.py`) |

## Next

1. Bootstrap one site from `baseline-v1` and record its timings; connect a
   Drupal site with the template's content model to it once, save a node
   and watch the page change, and open a draft from Drupal's preview. That
   closes DR-A.
