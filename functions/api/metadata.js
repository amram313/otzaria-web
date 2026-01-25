export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const BRANCH = "main"
  const upstreamUrl =
    `https://raw.githubusercontent.com/Otzaria/otzaria-library/refs/heads/${BRANCH}/metadata.json`

  const cacheKey = new Request(url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamUrl), request)

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  const r = await fetch(upstreamUrl, { method: "GET" })
  if (!r.ok) return new Response(`Upstream error: ${r.status}`, { status: 502 })

  const resp = new Response(r.body, r)
  resp.headers.set("Cache-Control", "public, max-age=3600") // שעה
  resp.headers.set("Access-Control-Allow-Origin", "*")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
