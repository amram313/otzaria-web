export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const OWNER  = (env && env.LIB_OWNER)  ? String(env.LIB_OWNER)  : "Otzaria"
  const REPO   = (env && env.LIB_REPO)   ? String(env.LIB_REPO)   : "otzaria-library"
  const BRANCH = (env && env.LIB_BRANCH) ? String(env.LIB_BRANCH) : "main"

  const upstreamRaw =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/files_manifest.json`
  const upstreamCdn =
    `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/files_manifest.json`

  const cacheKey = new Request(url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamRaw), request)

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  const tryFetch = async (targetUrl) => fetch(targetUrl, { method: "GET" })

  let r = await tryFetch(upstreamRaw)
  if (!r.ok) {
    const r2 = await tryFetch(upstreamCdn)
    if (r2.ok) r = r2
    else {
      const body =
        `Upstream error: ${r.status}\n` +
        `raw: ${upstreamRaw}\n` +
        `cdn: ${upstreamCdn}\n`
      return new Response(body, { status: r.status || 502 })
    }
  }

  const resp = new Response(r.body, r)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  resp.headers.set("Cache-Control", "public, max-age=300")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
