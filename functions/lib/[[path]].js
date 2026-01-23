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
  const { request, params } = context

  const segs = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean)

  if (segs.length === 0) {
    return new Response("Missing path", { status: 400 })
  }

  if (segs.some((s) => String(s).includes(".."))) {
    return new Response("Bad path", { status: 400 })
  }

  const BRANCH = "main"
  const upstreamBase =
    `https://raw.githubusercontent.com/amram313/otzaria-library/refs/heads/${BRANCH}/`

  const relPath = encodePathSegments(segs)
  const upstreamUrl = upstreamBase + relPath

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
    // מחזיר גם את הכתובת שאליה ניסינו לגשת כדי שתראה מה נשבר
    const msg =
      `Upstream error: ${upstreamResp.status}\n` +
      `Upstream URL: ${upstreamUrl}\n` +
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
