import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import path from "node:path";

// The Drupal site the pages read and the template's settings for it: values
// `next build` inlines into the bundles (the build pre-renders every page
// Drupal lists, and the browser loads Drupal's images), from the product's
// optional Orun secrets per environment (component.yaml optionalSecretEnv).
// DRUPAL_BASE_URL unset: no Drupal is connected yet, and the site renders the
// bundled sample content (lib/sample-drupal.mjs). The OAuth client and the
// revalidation secret are not here: Worker secrets, read at request time.
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DRUPAL_BASE_URL: (process.env.DRUPAL_BASE_URL ?? "").replace(/\/+$/, ""),
    DRUPAL_SITE_ID: process.env.DRUPAL_SITE_ID ?? "",
    DRUPAL_FRONT_PAGE: process.env.DRUPAL_FRONT_PAGE ?? "/home",
    // The site's public origin, for canonical and Open Graph links: set per
    // environment by the deploy's build command.
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  },
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
  },
  images: {
    // The Worker has no image optimiser: Drupal's files are served as
    // uploaded, from Drupal (or public/sample).
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/blog",
        destination: "/blog/page/0",
      },
      {
        source: "/es",
        destination: "/es/home",
        locale: false,
      },
      {
        source: "/en/principal",
        destination: "/",
        locale: false,
      },
    ];
  },
  // Required by @opennextjs/cloudflare, which bundles `.next/standalone/**`
  // into the Worker. Trace from the monorepo root so workspace dependencies
  // resolve from the root node_modules.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;

initOpenNextCloudflareForDev();
