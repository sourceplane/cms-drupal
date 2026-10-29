import { drupalBaseUrl } from "lib/drupal"

// A Drupal file or path as a URL the browser can load: on the connected
// Drupal, or on this site for the sample's photos (public/sample).
export function absoluteURL(uri: string) {
  return `${drupalBaseUrl}${uri.startsWith("/") ? uri : `/${uri}`}`
}
