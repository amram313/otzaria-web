// functions/lib/[[path]].js
export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const OWNER = env?.LIB_OWNER || "Otzaria"
  const REPO = env?.LIB_REPO || "otzaria-library"
  const BRANCH = env?.LIB_BRANCH || "main"

  // Route: /lib/<anything...>
  const pathname = url.pathname || ""
  if (pathname === "/lib" || pathname === "/lib/") {
    return new Response("Missing file path", { status: 400 })
  }

  // Preserve any existing percent-encoding in the path to avoid double-encoding
  // and to support filenames that contain quotes and other special characters.
  let rel = pathname.replace(/^\/lib\/?/, "")

  // Basic hardening
  if (!rel || rel.startsWith("/")) return new Response("Bad path", { status: 400 })

  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s)
    } catch (_) {
      return s
    }
  }

  // Prevent traversal after decoding
  const decodedForCheck = rel.split("/").map(safeDecode).join("/")
  if (decodedForCheck.includes("..")) return new Response("Bad path", { status: 400 })

  const primaryUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/${rel}`
  const cdnUrl = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${rel}`

  const cacheKey = new Request(
    url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(primaryUrl),
    request
  )

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  // Forward only a small set of headers (mainly for range/conditional requests)
  const forwardHeaders = new Headers()
  for (const h of ["range", "if-none-match", "if-modified-since"]) {
    const v = request.headers.get(h)
    if (v) forwardHeaders.set(h, v)
  }

  const method = request.method === "HEAD" ? "GET" : request.method

  let r = await fetch(primaryUrl, {
    method,
    headers: forwardHeaders,
  })

  // Fallback to CDN when GitHub RAW rate-limits or has a transient failure
  if (!r.ok && (r.status === 403 || r.status === 429 || r.status >= 500)) {
    r = await fetch(cdnUrl, {
      method,
      headers: forwardHeaders,
    })
  }

  if (!r.ok) {
    let body = ""
    try {
      body = await r.text()
    } catch (_) {
      body = ""
    }

    return new Response(body || `Upstream error: ${r.status}`, {
      status: r.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    })
  }

  const resp = new Response(r.body, r)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  resp.headers.set("Cache-Control", "public, max-age=31536000, immutable")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
