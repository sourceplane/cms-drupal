// OpenNext Cloudflare adapter config.
//
// Every page is pre-rendered from Drupal (getStaticProps; `fallback:
// "blocking"` renders a path Drupal adds later on its first visit) and kept
// until Drupal says it changed: its `next` module calls /api/revalidate,
// whose `res.revalidate(path)` renders the page again. On Workers:
//
//   incremental cache → R2 (NEXT_INC_CACHE_R2_BUCKET): every rendered page,
//                       keyed by build, so a deploy starts from fresh pages
//   queue             → in the isolate (memory queue): de-duplicated
//                       re-renders, which — like `res.revalidate` — call the
//                       Worker back through WORKER_SELF_REFERENCE (a Worker
//                       cannot fetch its own workers.dev hostname)
//
// No tag cache: the Pages Router revalidates by path, and nothing here uses
// `revalidateTag`. The bucket is provisioned by infra/terraform/cloudflare-r2
// and wired into wrangler.jsonc per environment.
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
