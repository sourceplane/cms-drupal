# cms-drupal — implementation plan

| Milestone | Lands | Done when |
|---|---|---|
| DR0 — the spec | the repository born (intent, CI, tooling, spec index), this doc set, DR-1…DR-3 | on main |
| DR1 — the site on Workers | `apps/web` (upstream at `80a89f1` plus the departures in IMPLEMENTATION-STATUS), `infra/terraform/cloudflare-r2`, `tests/web` | typecheck, lint, tests/web and build green with no Drupal; served unconnected and connected under `wrangler dev` |
| DR2 — a baseline | `blueprint.yaml`, `repo-blueprint.yaml`, `.baseline/`, the rename engine and bootstrap helpers, the record renderer, the context pack, `testing/` with the stand-in Drupal, `baseline.yml`, `tag.yml` | Baseline CI green; `baseline-v1` tagged |

Order inside DR1: the spike (the template on Next 16.3.8 and next-drupal 2.0.1,
the R2 cache and the self-reference binding, a stand-in Drupal; the router,
on-demand revalidation and preview under `wrangler dev`; the Worker's size);
the build-time settings; the sample Drupal as next-drupal's fetcher; the
revalidation route's secret; the Next 16 API moves; the workspace; the tests
with the stand-in over HTTP.
