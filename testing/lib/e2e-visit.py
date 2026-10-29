#!/usr/bin/env python3
"""What a visitor does to the served Worker — testing/e2e.test.sh's stages 3 and 4.

    e2e-visit.py born      <url> <values.json>
    e2e-visit.py connected <url> <values.json>    (E2E_API, E2E_SECRET, E2E_PREVIEW_SECRET)

`born` is a fresh product, no Drupal site: every page the template promises
renders from the bundled sample Drupal under the "No Drupal site is
connected" notice and the product's name — the landing page's paragraphs
(the strings the template's own Cypress tests look for), the Spanish
translation under /es, the basic page with its captioned inline image, the
blog two to a page with its author and dates, an article, the properties
view (12, four at a time) and the search the browser makes against the
view's own link; unknown paths 404 in both languages, never a 500; preview
has nothing to preview (401) and revalidation is off (401, with or without
a secret); the sample photos are static assets.

`connected` is the same product built against the stand-in Drupal
(tests/web/fake-drupal.mjs) with the OAuth client and the revalidation
secret as Worker secrets: the pages render from it with no sample notice;
a second visit reads Drupal not at all (every page is an entry in the local
R2 bucket); an edit in Drupal does not show until the secret-checked
revalidation route re-renders that path (through WORKER_SELF_REFERENCE), and
a wrong secret changes nothing; Drupal's preview link (its secret validated
by Drupal) opens the draft revision with the client's token, and leaving
preview restores the published page.
"""
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

mode, base, values = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
name = values["productname"]
problems = []


def bad(m):
    problems.append(m)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener = urllib.request.build_opener(NoRedirect)


def request(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=dict(headers or {}), method=method)
    try:
        r = opener.open(req, timeout=90)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, r.headers, r.read()


def get(path, headers=None):
    s, h, b = request(base + path, headers=headers)
    return s, h, b.decode("utf-8", "replace")


def text(page):
    # React separates adjacent text nodes with `<!-- -->` in server HTML.
    return html.unescape(page.replace("<!-- -->", ""))


def title_of(page):
    # next/head marks its tags (`<title data-next-head="">`).
    m = re.search(r"<title[^>]*>(.*?)</title>", page, re.S)
    return text(m.group(1)) if m else None


def expect(path, *needles, status=200, headers=None):
    s, h, page = get(path, headers)
    if s != status:
        bad(f"{path} answered {s}, not {status}")
        return h, page
    t = text(page)
    for n in needles:
        if n not in t:
            bad(f"{path} does not say {n!r}")
    return h, page


def done(summary):
    if problems:
        for p in problems:
            print(f"  ✕ {p}", file=sys.stderr)
        sys.exit(1)
    for line in summary:
        print(f"   {line}")
    sys.exit(0)


NOTICE = "No Drupal site is connected"
VIEW = "/jsonapi/views/properties/listing"
INCLUDE = "include=field_location%2Cfield_images.field_media_image"

# ── a fresh product: no Drupal site ──────────────────────────────────────
if mode == "born":
    _, home = expect("/", NOTICE, "Build Something Amazing",
                     "Must today firm from bag. Investment try cold a when capital. Everything wait person service.",
                     "Marketing Strategy", "Frequently Asked Questions", "Move weight here just either attorney?",
                     'data-cy="navbar-menu"')
    if title_of(home) != f"Home | {name}":
        bad(f"/ is titled {title_of(home)!r}, not 'Home | {name}'")
    t = text(home)
    if f">{name}</a>" not in t:
        bad(f"the navbar's brand is not the product's name {name!r}")
    for item in ("Home", "Blog", "Properties", "About", "GitHub"):
        if f">{item}</a>" not in t:
            bad(f"the main menu has no {item!r}")
    for src in ("/sample/hero.webp", "/sample/photo-1.webp"):
        if f'src="{src}"' not in home:
            bad(f"/ does not show {src}")
    _, es = expect("/es", NOTICE, "Construye Algo Asombroso",
                   "Dicta laboriosam magnam possimus ad. Ratione rem nihil nostrum dolore reiciendis enim.")
    for item in ("Inicio", "Propiedades", "Acerca"):
        if f">{item}</a>" not in text(es):
            bad(f"/es's menu has no {item!r}")
    _, about = expect("/about", "This is the caption", 'src="/sample/photo-2.webp"')
    if title_of(about) != f"About | {name}":
        bad(f"/about is titled {title_of(about)!r}")
    expect("/es/about", "Este es el pie de foto")
    expect("/blog", "Latest Articles.", "Dynamic Routing and Static Generation", "Posted by", "Arshad", "June 13, 2021")
    expect("/blog/page/1", "Previewing Drafts Before They Go Live")
    expect("/es/blog", "Últimas Publicaciones.", "Enrutamiento dinámico y Generación Estática", "June 14, 2021")
    expect("/blog/learn-how-pre-render-pages-using-static-generation-nextjs",
           "Learn How to Pre-render Pages Using Static Generation with Next.js", "Arshad", "June 13, 2021")
    expect("/properties", "Find your place", "Found 12 properties.", "484 Robert Crest Apt. 875", "For Sale")
    # The browser's search follows the view's own link — on this site.
    pages = []
    for p in range(3):
        s, _, b = get(f"/api/sample-drupal{VIEW}?page={p}&{INCLUDE}")
        doc = json.loads(b) if s == 200 else {}
        pages.append(len(doc.get("data", [])))
        if s != 200 or doc.get("meta", {}).get("count") != 12:
            bad(f"the sample view's page {p} answered {s} {doc.get('meta')}")
    if pages != [4, 4, 4]:
        bad(f"the sample view pages hold {pages}, not four each")
    s, _, b = get(f"/api/sample-drupal{VIEW}?page=0&views-filter%5Blocation%5D=1&views-filter%5Bstatus%5D=sale"
                  f"&views-filter%5Bbeds%5D=4&views-filter%5Bbaths%5D=1&{INCLUDE}")
    found = [r["attributes"]["title"] for r in json.loads(b).get("data", [])] if s == 200 else None
    if found != ["17 Grand View Avenue"]:
        bad(f"San Francisco, for sale, 4+ beds found {found}, not the one house")
    for path in ("/no-such-page", "/es/no-such-page", "/blog/no-such-post"):
        s, _, _ = get(path)
        if s != 404:
            bad(f"{path} answered {s}, not 404")
    s, _, b = get("/api/preview?path=/about&secret=anything")
    if s != 401 or NOTICE not in b:
        bad(f"/api/preview answered {s} {b[:120]!r}, not 401 with nothing to preview")
    for q in ("path=/about", "path=/about&secret=", "path=/about&secret=anything"):
        s, _, _ = get(f"/api/revalidate?{q}")
        if s != 401:
            bad(f"/api/revalidate?{q} answered {s}: revalidation must be off without its secret")
    for asset, kind in (("/sample/hero.webp", "image/webp"), ("/meta.jpg", "image/jpeg"), ("/favicon.ico", "image")):
        s, h, _ = request(base + asset)
        if s != 200 or kind not in (h.get("content-type") or ""):
            bad(f"{asset} answered {s} {h.get('content-type')}")
    done([
        "/, /es, /about, the blog (two pages, Spanish), an article and /properties render the sample Drupal under the notice",
        f"the navbar and the titles say {name!r}; the view's search (12, four a page, one 4-bed sale) answers on the site",
        "unknown paths 404; preview has nothing to preview and revalidation is off (401); the photos are assets",
    ])

# ── the product connected to a Drupal site ───────────────────────────────
api = os.environ["E2E_API"]
secret = os.environ["E2E_SECRET"]
preview_secret = os.environ["E2E_PREVIEW_SECRET"]


def drupal(path, body=None):
    s, _, b = request(api + path, data=json.dumps(body).encode() if body is not None else None,
                      method="POST" if body is not None else "GET")
    return json.loads(b) if b else {}


def reset():
    drupal("/__reset", {})


def calls():
    return drupal("/__calls")


PAGES = ("/", "/about", "/blog", "/es", "/properties")
for path in PAGES:  # the first visit renders what the build did not
    expect(path)
_, home = expect("/", "Build Something Amazing", "Move weight here just either attorney?")
if NOTICE in text(home):
    bad("a connected site still says no Drupal site is connected")
_, props = expect("/properties", "Found 12 properties.")
if f"{api}{VIEW}" not in props:
    bad("/properties' view does not link the browser to the connected Drupal")
s, _, _ = get(f"/api/sample-drupal{VIEW}")
if s != 404:
    bad(f"the sample view answered {s} on a connected site, not 404")

# The cache: every page is in R2 now; a second round reads Drupal not at all.
reset()
for path in PAGES:
    expect(path)
if calls():
    bad(f"a second visit read Drupal: {calls()}")

# On-demand revalidation: an edit waits for Drupal's call to /api/revalidate.
drupal("/__edit", {"path": "/about", "title": "About the team"})
_, page = expect("/about")
if title_of(page) != f"About | {name}":
    bad(f"an edit showed before revalidation: {title_of(page)!r}")
for wrong in ("", "nope"):
    s, _, _ = get(f"/api/revalidate?path=/about&secret={wrong}")
    if s != 401:
        bad(f"revalidation with secret {wrong!r} answered {s}, not 401")
_, page = expect("/about")
if title_of(page) != f"About | {name}":
    bad("a refused revalidation changed the page")
reset()
s, _, b = get(f"/api/revalidate?path=/about&secret={secret}")
if s != 200:
    bad(f"revalidation with the secret answered {s} {b[:200]!r}")
reread = calls()
if not reread.get("node"):
    bad(f"revalidation did not re-read the node from Drupal: {reread}")
_, page = expect("/about")
if title_of(page) != f"About the team | {name}":
    bad(f"after revalidation /about is titled {title_of(page)!r}")
reset()
expect("/about")
if calls():
    bad(f"the revalidated page was not cached: {calls()}")
s, _, b = get(f"/api/revalidate?path=/home&secret={secret}")
if s != 200:
    bad(f"revalidating the front page by Drupal's path answered {s} {b[:200]!r}")

# Preview: Drupal's link, its secret validated by Drupal, the draft read with a token.
link = "/api/preview?path=/about&resourceVersion=id:42&plugin=simple_oauth&secret="
s, _, _ = get(link + "nope")
if s != 401:
    bad(f"a preview link with a wrong secret answered {s}, not 401")
s, h, _ = get(link + preview_secret)
cookies = [c.split(";")[0] for c in h.get_all("set-cookie") or [] if "Expires=Thu, 01 Jan 1970" not in c]
if s != 307 or h.get("location") != "/about" or not any(c.startswith("__prerender_bypass=") for c in cookies):
    bad(f"the preview link answered {s} → {h.get('location')} with cookies {cookies}")
jar = {"Cookie": "; ".join(cookies)}
h, page = expect("/about", headers=jar)
if title_of(page) != f"About the team (draft) | {name}":
    bad(f"preview shows {title_of(page)!r}, not the draft")
if "no-store" not in (h.get("cache-control") or ""):
    bad(f"a preview page is cacheable: {h.get('cache-control')}")
_, page = expect("/about")
if title_of(page) != f"About the team | {name}":
    bad(f"the draft leaked out of preview: {title_of(page)!r}")
s, h, _ = get("/api/exit-preview", headers=jar)
expired = [c for c in h.get_all("set-cookie") or [] if "Expires=Thu, 01 Jan 1970" in c]
if s != 307 or len(expired) < 2:
    bad(f"leaving preview answered {s} and expired {len(expired)} cookies")
for path in ("/no-such-page", "/es/no-such-page"):
    s, _, _ = get(path)
    if s != 404:
        bad(f"{path} answered {s} on a connected site, not 404")
done([
    "the pages render from the stand-in Drupal; the view links the browser to it; the sample route is gone",
    "a second visit reads Drupal not at all; an edit waits for /api/revalidate (wrong secrets refused), then shows",
    "Drupal's preview link opens the draft (private, not cached) and leaving preview restores the published page",
])
