export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const basePath = (url.searchParams.get("path") || "").trim()
  if (!basePath) {
    return new Response("Missing ?path=", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    })
  }

  const cacheKey = new Request(url.toString(), request)
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  const OWNER  = (env && env.LIB_OWNER)  ? String(env.LIB_OWNER)  : "Otzaria"
  const REPO   = (env && env.LIB_REPO)   ? String(env.LIB_REPO)   : "otzaria-library"
  const BRANCH = (env && env.LIB_BRANCH) ? String(env.LIB_BRANCH) : "main"

  const upstreamRaw =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/files_manifest.json`
  const upstreamCdn =
    `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/files_manifest.json`

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
      return new Response(body, {
        status: r.status || 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      })
    }
  }

  let manifest
  try {
    manifest = await r.json()
  } catch (_) {
    return new Response("Bad manifest JSON", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    })
  }

  const safeDecode = (s) => {
    try { return decodeURIComponent(s) } catch (_) { return s }
  }

  const norm = String(basePath).replaceAll("\\", "/").replace(/^\/+/, "")
  const parts = norm.split("/").filter(Boolean)
  const baseFile = safeDecode(parts[parts.length - 1] || "")
  const unitDir = safeDecode(parts[parts.length - 2] || "")

  // bookRoot = folder that contains both unit folders and a "מפרשים" folder.
  // Example:
  //   .../משנה תורה/ספר זמנים/<book>.txt
  //   .../משנה תורה/מפרשים/<commentator>/ספר זמנים/<commentary>.txt
  const bookRoot = parts.slice(0, Math.max(0, parts.length - 2)).join("/") + "/"
  const commentRootPrefix = bookRoot + "מפרשים/"
  const unitNeedle = "/" + unitDir + "/"

  const baseStem = baseFile.replace(/\.txt$/i, "")
  const baseKey = baseStem.includes(",")
    ? baseStem.split(",").slice(1).join(",").trim()
    : baseStem

  const out = []

  for (const k in manifest) {
    if (!k || typeof k !== "string") continue
    if (!k.endsWith(".txt")) continue
    if (!k.startsWith(commentRootPrefix)) continue
    if (!k.includes(unitNeedle)) continue

    // Heuristic filter: commentaries for the current base book almost always
    // include the base key (e.g. "הלכות תעניות") in the filename.
    const fileName = k.split("/").pop() || ""
    if (baseKey && !fileName.includes(baseKey)) continue

    const title = fileName.replace(/\.txt$/i, "")
    const linksPath = `sefariaToOtzaria/sefaria_export/links/${title}_links.json`
    if (!manifest[linksPath]) continue

    out.push({
      title,
      book_path: k,
      links_path: linksPath,
    })
  }

  out.sort((a, b) => String(a.title).localeCompare(String(b.title), "he"))

  const payload = {
    ok: true,
    base: {
      path: norm,
      file: baseFile,
      unit: unitDir,
      book_root: bookRoot,
      base_key: baseKey,
    },
    commentaries: out,
  }

  const resp = new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  })

  context.waitUntil(caches.default.put(cacheKey, resp.clone()))
  return resp
}
