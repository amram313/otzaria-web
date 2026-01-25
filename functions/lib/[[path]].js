export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const BRANCH = "main"

  // Preserve any existing percent-encoding in the path to avoid double-encoding
  // and to support filenames that contain quotes and other special characters.
  // Route: /lib or /lib/<anything...>
  const pathname = url.pathname || ""
  if (pathname === "/lib" || pathname === "/lib/") {
    return new Response("Missing file path", { status: 400 })
  }

  let rel = pathname.replace(/^\/lib\/?/, "")
  // Basic hardening
  if (!rel || rel.startsWith("/")) return new Response("Bad path", { status: 400 })

  const safeDecode = (s) => {
    try { return decodeURIComponent(s) } catch (_) { return s }
  }

  // Prevent traversal after decoding
  const decodedForCheck = rel.split("/").map(safeDecode).join("/")
  if (decodedForCheck.includes("..")) return new Response("Bad path", { status: 400 })

  const upstreamUrl =
    `https://raw.githubusercontent.com/Otzaria/otzaria-library/refs/heads/${BRANCH}/lib/${rel}`

  const cacheKey = new Request(
    url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamUrl),
    request
  )

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  // Forward method + headers for range/caching friendliness
  const r = await fetch(upstreamUrl, {
    method: request.method === "HEAD" ? "GET" : request.method,
    headers: request.headers,
  })

  if (!r.ok) {
    return new Response(`Upstream error: ${r.status}`, { status: 502 })
  }

  const resp = new Response(r.body, r)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  resp.headers.set("Cache-Control", "public, max-age=31536000, immutable")

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
