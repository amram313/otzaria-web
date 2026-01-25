export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const OWNER = "Y-PLONI"
  const REPO = "otzaria-library"
  const BRANCH = "main"

  const upstreamUrl =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/files_manifest.json`

  const cacheKey = new Request(url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamUrl), request)

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  const upstreamResp = await fetch(upstreamUrl, {
    headers: { "User-Agent": "otzaria-web" },
  })

  if (!upstreamResp.ok) {
    return new Response(`Upstream error: ${upstreamResp.status}`, { status: 502 })
  }

  const resp = new Response(upstreamResp.body, upstreamResp)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  // It's large; cache it longer, but still refreshable.
  resp.headers.set("Cache-Control", "public, max-age=3600")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
