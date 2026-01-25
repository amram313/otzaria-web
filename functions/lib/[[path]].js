function safeDecode(s) {
  try {
    return decodeURIComponent(String(s))
  } catch (e) {
    return String(s)
  }
}

function encodePathSegments(segments) {
  // מנקה קידוד כפול:
  // אם מגיע "%D7%90..." -> נהפוך ל-"א..." ואז נקודד פעם אחת נכון.
  return segments
    .map((s) => safeDecode(s))
    .map((s) => encodeURIComponent(String(s)))
    .join("/")
}

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  // Route: /lib/<path...>
  const pathname = url.pathname || ""
  if (pathname === "/lib" || pathname === "/lib/") {
    return new Response("Missing file path", { status: 400 })
  }

  const rel = pathname.replace(/^\/lib\/?/, "")
  const segs = rel.split("/").filter(Boolean)

  // Prevent traversal after decoding
  const decodedForCheck = segs.map(safeDecode)
  if (decodedForCheck.some((s) => String(s).includes(".."))) {
    return new Response("Bad path", { status: 400 })
  }

  const OWNER = "Y-PLONI"
  const REPO = "otzaria-library"
  const BRANCH = "main"

  // IMPORTANT: upstream base is the REPO ROOT (not /lib/)
  const upstreamBase =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/`

  const relPath = encodePathSegments(segs)
  const upstreamUrl = upstreamBase + relPath

  // תומך Range (חשוב ל-PDF). אם יש Range – לא מקשיחים cache.
  const hasRange = request.headers.has("range")
  const cacheKey = new Request(url.toString() + (url.search ? "&" : "?") + "up=" + encodeURIComponent(upstreamUrl), request)

  if (!hasRange) {
    const cached = await caches.default.match(cacheKey)
    if (cached) return cached
  }

  const upstreamResp = await fetch(upstreamUrl, {
    headers: request.headers,
    method: request.method === "HEAD" ? "GET" : request.method,
  })

  if (!upstreamResp.ok) {
    const msg =
      `Upstream error: ${upstreamResp.status}\n` +
      `URL: ${upstreamUrl}\n` +
      `Rel path: ${relPath}\n`
    return new Response(msg, { status: 502 })
  }

  const resp = new Response(upstreamResp.body, upstreamResp)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  resp.headers.set("Cache-Control", hasRange ? "no-store" : "public, max-age=86400")

  if (!hasRange) {
    context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  }

  return resp
}
