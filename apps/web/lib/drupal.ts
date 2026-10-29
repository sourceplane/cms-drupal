import { DrupalClient } from "next-drupal"

import { createSampleDrupal } from "lib/sample-drupal.mjs"

// The Drupal site the pages read: its URL, stored per environment as the
// product's DRUPAL_BASE_URL secret and inlined by `next build`
// (next.config.ts). Unset, no Drupal is connected yet and next-drupal reads
// the bundled sample site instead (lib/sample-drupal.mjs) — same requests,
// same shapes, answered in the Worker.
export const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL || ""
export const connected = drupalBaseUrl !== ""

// Never contacted: with no Drupal connected every request goes to the sample
// fetcher below, which reads only the path and the query.
const SAMPLE_ORIGIN = "https://sample-drupal.invalid"
const sample = connected ? null : createSampleDrupal()

// The OAuth client next-drupal uses for preview (a draft is only readable
// with a token): Worker secrets, read at request time. Without both, preview
// has no credentials and Drupal refuses the draft.
const clientId = process.env.DRUPAL_CLIENT_ID
const clientSecret = process.env.DRUPAL_CLIENT_SECRET

export const drupal = new DrupalClient(connected ? drupalBaseUrl : SAMPLE_ORIGIN, {
  frontPage: "/home",
  ...(connected && clientId && clientSecret
    ? { auth: { clientId, clientSecret } }
    : {}),
  ...(sample
    ? {
        fetcher: (input: RequestInfo | URL, init?: RequestInit) =>
          sample.handle(new Request(input, init), {
            viewBase: "/api/sample-drupal",
          }),
      }
    : {}),
})
