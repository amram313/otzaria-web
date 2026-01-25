export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  // You can override these in Cloudflare Pages → Settings → Environment variables
  const OWNER  = (env && env.LIB_OWNER)  ? String(env.LIB_OWNER)  : "Otzaria"
  const REPO   = (env && env.LIB_REPO)   ? String(env.LIB_REPO)   : "otzaria-library"
  const BRANCH = (env && env.LIB_BRANCH) ? String(env.LIB_BRANCH) : "main"

  // Route: /lib/<anything...>
  const pathname = url.pathname || ""
  if (pathname === "/lib" || pathname === "/lib/") {
    return new Response("Missing file path", { status: 400 })
  }

  // Preserve any existing percent-encoding in the path to avoid double-encoding.
  let rel = pathname.replace(/^\/lib\/?/, "")
  if (!rel || rel.startsWith("/")) return new Response("Bad path", { status: 400 })

  const safeDecode = (s) => {
    try { return decodeURIComponent(s) } catch (_) { return s }
  }

  // Prevent traversal after decoding
  const decodedForCheck = rel.split("/").map(safeDecode).join("/")
  if (decodedForCheck.includes("..")) return new Response("Bad path", { status: 400 })

  const upstreamRaw =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/lib/${rel}`
  const upstreamCdn =
    `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/lib/${rel}`

  // Cache key should vary by the real upstream URL used
  const cacheKey = new Request(
    url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamRaw),
    request
  )

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  // Forward only what we actually need (mostly Range)
  const headers = new Headers()
  const range = request.headers.get("range")
  if (range) headers.set("range", range)

  const method = request.method === "HEAD" ? "GET" : request.method

  const tryFetch = async (targetUrl) => {
    return fetch(targetUrl, { method, headers })
  }

  let r = await tryFetch(upstreamRaw)
  if (!r.ok) {
    // Fallback to CDN (often more reliable and less rate-limited)
    const r2 = await tryFetch(upstreamCdn)
    if (r2.ok) r = r2
    else {
      // Return the REAL upstream status (not always 502), and include the URLs for debugging.
      const body =
        `Upstream error: ${r.status}\n` +
        `raw: ${upstreamRaw}\n` +
        `cdn: ${upstreamCdn}\n`
      return new Response(body, { status: r.status || 502 })
    }
  }

  const resp = new Response(r.body, r)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  // cache immutable for a year (library files are versioned in git)
  resp.headers.set("Cache-Control", "public, max-age=31536000, immutable")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
