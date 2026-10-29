# Epics

Orun-style work programs. Each epic is a folder carrying `epic.yaml` (the
declaration the platform reads: slug, key prefix, milestones with exit
criteria and task keys) beside its doc set. The pull request that adds the
folder is the adoption; the merge creates the epic in the workspace.

| Epic | Cluster | Status | What it is |
|------|---------|--------|------------|
| [`cms-drupal/`](./cms-drupal/) | **DR** | In progress (DR1: the site on Workers) | Vercel's Drupal Marketing Site (next-drupal's example-marketing) on Cloudflare Workers, every page cached in R2 and re-rendered on Drupal's call, drafts in preview — and an Orun baseline that instantiates it in one landing, live with sample content before a Drupal is connected (DR2) |

As-built ≠ intent: what shipped lives in each epic's `IMPLEMENTATION-STATUS.md`.
