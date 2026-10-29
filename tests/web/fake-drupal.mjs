#!/usr/bin/env node
// A stand-in Drupal site, for testing a CONNECTED site offline.
//
//   node fake-drupal.mjs --port <n> --client <id> --client-secret <s> --preview-secret <s>
//
// It is the sample Drupal (apps/web/lib/sample-drupal.mjs: the same content,
// answered in the shapes Drupal's jsonapi, decoupled_router,
// jsonapi_menu_items and jsonapi_views modules return) over HTTP, plus what a
// real Drupal adds for a connected site:
//   simple_oauth:  POST /oauth/token (grant_type=client_credentials, the
//                  client in `Authorization: Basic` or the form) → a Bearer
//                  token; a wrong client is 401
//   next module:   POST /next/draft-url (the preview link's query, as JSON)
//                  → 200 when its `secret` is the preview secret, else 401
//   revisions:     a node read with `resourceVersion=id:<n>` is its DRAFT —
//                  "<title> (draft)", unpublished — readable only with a token
//                  this server issued (403 without one), as Drupal's
//                  revision access does
//
// Control (for the e2e's cache assertions):
//   GET  /__calls → {"<operation>": <reads>, …} since the last reset
//   POST /__reset → zero the counts
//   POST /__edit  → {"path": "/about", "title": "…"}: the published revision
//                   of the node at that path says something new
import { createServer } from "node:http";

import { createSampleDrupal } from "../../apps/web/lib/sample-drupal.mjs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const port = Number(arg("port") ?? 4040);
const clientId = arg("client") ?? "";
const clientSecret = arg("client-secret") ?? "";
const previewSecret = arg("preview-secret") ?? "";

const tokens = new Set();
const edits = new Map(); // node uuid → attributes over the published revision
let calls = {};
const count = (op) => (calls[op] = (calls[op] ?? 0) + 1);

const drupal = createSampleDrupal({
  overrides(resource, locale, revision, authed) {
    if (!resource.type?.startsWith("node--")) return undefined;
    if (revision && revision.startsWith("id:")) {
      if (!authed) return null;
      const base = { ...resource.attributes, ...(locale !== "en" && resource.es ? resource.es : {}), ...(edits.get(resource.id) ?? {}) };
      return { title: `${base.title} (draft)`, status: false };
    }
    return edits.get(resource.id);
  },
});

function operation(pathname) {
  const p = pathname.replace(/^\/es(?=\/)/, "");
  if (p === "/router/translate-path") return "translate";
  if (p === "/jsonapi") return "index";
  if (p.startsWith("/jsonapi/menu_items/")) return "menu";
  if (p.startsWith("/jsonapi/views/")) return "view";
  if (/^\/jsonapi\/node\/\w+\/[\w-]+$/.test(p)) return "node";
  if (/^\/jsonapi\/node\/\w+$/.test(p)) return "collection";
  return "other";
}

function send(res, status, body, type = "application/vnd.api+json") {
  res.writeHead(status, { "content-type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if (url.pathname === "/__calls") return send(res, 200, calls, "application/json");
  if (url.pathname === "/__reset" && req.method === "POST") {
    calls = {};
    return send(res, 200, {}, "application/json");
  }
  if (url.pathname === "/__edit" && req.method === "POST") {
    const { path, ...attributes } = JSON.parse(raw || "{}");
    const t = drupal.translate(path);
    if (!t) return send(res, 404, { message: `no node at ${path}` }, "application/json");
    edits.set(t.n.id, { ...(edits.get(t.n.id) ?? {}), ...attributes });
    return send(res, 200, { uuid: t.n.id }, "application/json");
  }

  if (url.pathname === "/oauth/token" && req.method === "POST") {
    count("token");
    const form = new URLSearchParams(raw);
    let [id, secret] = [form.get("client_id"), form.get("client_secret")];
    const basic = (req.headers.authorization ?? "").match(/^Basic (.+)$/);
    if (basic) [id, secret] = Buffer.from(basic[1], "base64").toString().split(":");
    if (form.get("grant_type") !== "client_credentials" || id !== clientId || secret !== clientSecret || !clientId) {
      return send(res, 401, { error: "invalid_client", error_description: "Client authentication failed." }, "application/json");
    }
    const token = `tok-${tokens.size + 1}-${Date.now()}`;
    tokens.add(token);
    return send(res, 200, { token_type: "Bearer", expires_in: 300, access_token: token }, "application/json");
  }

  if (url.pathname === "/next/draft-url" && req.method === "POST") {
    count("draft-url");
    const body = JSON.parse(raw || "{}");
    if (!previewSecret || body.secret !== previewSecret) return send(res, 401, { message: "Invalid preview secret." }, "application/json");
    return send(res, 200, { path: body.path, resourceVersion: body.resourceVersion }, "application/json");
  }

  count(operation(url.pathname));
  const bearer = (req.headers.authorization ?? "").match(/^Bearer (.+)$/);
  const answer = await drupal.handle(new Request(url, { method: req.method, headers: { accept: "application/vnd.api+json" } }), {
    authed: Boolean(bearer && tokens.has(bearer[1])),
  });
  send(res, answer.status, await answer.text());
}).listen(port, "127.0.0.1", () => console.log(`stand-in Drupal on http://127.0.0.1:${port}`));
