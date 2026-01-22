
function encodePathSegments(segments) {
  return segments.map((s) => encodeURIComponent(String(s))).join("/")
}

export async function onRequest(context) {
  const { request, params } = context

  // לפי הדוקס: [[param]] מחזיר מערך של סגמנטים :contentReference[oaicite:3]{index=3}
  const segs = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean)

  if (segs.length === 0) {
    return new Response("Missing path", { status: 400 })
  }

  // חסימה בסיסית לנתיבים מסוכנים
  if (segs.some((s) => String(s).includes(".."))) {
    return new Response("Bad path", { status: 400 })
  }

  const BRANCH = "main"
  const upstreamBase = `https://raw.githubusercontent.com/amram313/otzaria-library/refs/heads/${BRANCH}/`
  const upstreamUrl = upstreamBase + encodePathSegments(segs)

  // תומך Range (חשוב ל-PDF). אם יש Range – לא מקשיחים cache.
  const hasRange = request.headers.has("range")
  const cacheKey = new Request(new URL(request.url).toString(), request)

  if (!hasRange) {
    const cached = await caches.default.match(cacheKey)
    if (cached) return cached
  }

  const upstreamResp = await fetch(upstreamUrl, {
    method: "GET",
    headers: hasRange ? { range: request.headers.get("range") } : {}
  })

  if (!upstreamResp.ok) {
    return new Response(`Upstream error: ${upstreamResp.status}`, { status: 502 })
  }

  const resp = new Response(upstreamResp.body, upstreamResp)
  resp.headers.set("Access-Control-Allow-Origin", "*")
  resp.headers.set("Cache-Control", hasRange ? "no-store" : "public, max-age=86400")

  if (!hasRange) {
    context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  }

  return resp
}
