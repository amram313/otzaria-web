(function(){
// ---------- EPUB (Aquile) ----------
      // Split by H2 into multiple xhtml files => TOC navigation works reliably.
      function epubParse(html) {
        return new DOMParser().parseFromString(
          "<!doctype html><html><body>" + String(html || "") + "</body></html>",
          "text/html"
        )
      }

      function xhtmlFixVoidTags(s) {
        // very small fix for XHTML-ish output
        return String(s)
          .replace(/<br>/gi, "<br />")
          .replace(/<hr>/gi, "<hr />")
      }

      function epubSplitSections(doc) {
        const body = doc.body
        const nodes = Array.from(body.childNodes)

        // choose split tag: H2 if exists, else H1
        const hasH2 = Array.from(body.querySelectorAll("h2")).length > 0
        const splitTag = hasH2 ? "H2" : "H1"

        const sections = []
        let cur = []

        function pushSection() {
          if (cur.length) sections.push(cur)
          cur = []
        }

        nodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE && String(n.tagName).toUpperCase() === splitTag) {
            if (cur.length) pushSection()
            cur.push(n)
          } else {
            cur.push(n)
          }
        })

        pushSection()
        return { sections, splitTag }
      }

      function epubMakeSectionDoc(sectionNodes, globalHeadingCounter) {
        const d = document.implementation.createHTMLDocument("")
        const container = d.createElement("div")
        sectionNodes.forEach((n) => {
          container.appendChild(d.importNode(n, true))
        })

        // add explicit anchors sec-N before each heading
        const headings = Array.from(container.querySelectorAll("h1,h2,h3,h4"))
        const map = [] // {lvl, file, id, text}
        headings.forEach((h) => {
          const lvl = clamp(Number(String(h.tagName).slice(1)), 1, 4)
          const id = "sec-" + globalHeadingCounter.value++
          const a = d.createElement("a")
          a.setAttribute("id", id)
          h.parentNode.insertBefore(a, h)
          h.setAttribute("id", id)
          map.push({ lvl, id, text: (h.textContent || "").trim() || "כותרת" })
        })

        return { html: container.innerHTML, map }
      }

      function buildTreeFromFlat(items) {
        const roots = []
        const stack = []
        for (const it of items) {
          const node = { ...it, children: [] }
          while (stack.length && stack[stack.length - 1].lvl >= node.lvl) stack.pop()
          if (!stack.length) roots.push(node)
          else stack[stack.length - 1].children.push(node)
          stack.push(node)
        }
        return roots
      }

      function renderNavTree(nodes, hrefBuilder) {
        if (!nodes || !nodes.length) return "<ol></ol>"
        let out = "<ol>"
        for (const n of nodes) {
          out += "<li><a href=\"" + xmlEscape(hrefBuilder(n)) + "\">" + xmlEscape(n.text) + "</a>"
          if (n.children && n.children.length) out += renderNavTree(n.children, hrefBuilder)
          out += "</li>"
        }
        out += "</ol>"
        return out
      }

      function buildNcx(flatItems, uid, title) {
        let play = 1
        const navPoints = flatItems.slice(0, 1200).map((it) => {
          const pid = "navPoint-" + play
          const order = play++
          return (
            "<navPoint id=\"" + pid + "\" playOrder=\"" + order + "\">" +
              "<navLabel><text>" + xmlEscape(it.text) + "</text></navLabel>" +
              "<content src=\"" + xmlEscape(it.href) + "\"/>" +
            "</navPoint>"
          )
        }).join("")

        return (
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"
 "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${xmlEscape(uid)}"/>
    <meta name="dtb:depth" content="4"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${xmlEscape(title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`
        )
      }

      async function exportEpubFull() {
        if (!requireJSZip()) return

        const title = getTitleFromDom()
        const outName = fileStem(baseNameFromPath(currentPath)) + ".epub"

        let html = currentSafeHtml
        if (!html) {
          html = "<h1>" + xmlEscape(title) + "</h1><pre>" + xmlEscape(currentPlainText || "") + "</pre>"
        }

        const doc = epubParse(html)
        const split = epubSplitSections(doc)

        const uid = "uid-" + Math.random().toString(16).slice(2)
        const zip = new JSZip()

        zip.file("mimetype", "application/epub+zip", { compression: "STORE" })
        zip.folder("META-INF").file("container.xml",
`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

        const oebps = zip.folder("OEBPS")

        const css =
`body{ font-family:sans-serif; direction:rtl; line-height:1.85; font-size:1em; }
h1{ font-size:1.6em; margin:0 0 .6em 0; }
h2{ font-size:1.3em; margin:1.2em 0 .5em 0; }
h3{ font-size:1.15em; margin:1.0em 0 .4em 0; }
a[id]{ display:block; height:0; width:0; }
pre{ white-space:pre-wrap; }`
        oebps.file("style.css", css)

        const globalHeadingCounter = { value: 0 }

        const sectionFiles = []
        const allHeadingsFlat = [] // [{lvl,text,href}]
        const allHeadingsForTree = [] // [{lvl,text,href}] for tree nesting too

        for (let i = 0; i < split.sections.length; i++) {
          const nodes = split.sections[i]
          const sec = epubMakeSectionDoc(nodes, globalHeadingCounter)

          const filename = "section-" + String(i).padStart(3, "0") + ".xhtml"
          sectionFiles.push(filename)

          // Create XHTML for section
          const bodyInner = xhtmlFixVoidTags(sec.html)

          const xhtml =
`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="he" lang="he" dir="rtl">
  <head>
    <meta charset="utf-8"/>
    <title>${xmlEscape(title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    ${bodyInner}
  </body>
</html>`
          oebps.file(filename, xhtml)

          // collect headings for TOC
          sec.map.forEach((h) => {
            const href = filename + "#" + h.id
            allHeadingsFlat.push({ lvl: h.lvl, text: h.text, href })
            allHeadingsForTree.push({ lvl: h.lvl, text: h.text, href })
          })
        }

        // Build NAV (nested)
        const tree = buildTreeFromFlat(allHeadingsForTree)
        const navOl = renderNavTree(tree, (n) => n.href)

        const navXhtml =
`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="he" lang="he" dir="rtl">
  <head>
    <meta charset="utf-8"/>
    <title>תוכן עניינים</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc" role="doc-toc" xmlns:epub="http://www.idpf.org/2007/ops">
      <h1>תוכן עניינים</h1>
      ${navOl}
    </nav>
  </body>
</html>`
        oebps.file("nav.xhtml", navXhtml)

        const ncx = buildNcx(allHeadingsFlat, uid, title)
        oebps.file("toc.ncx", ncx)

        // OPF manifest/spine
        let manifest = ""
        manifest += `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`
        manifest += `<item id="css" href="style.css" media-type="text/css"/>`
        manifest += `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
        sectionFiles.forEach((f, idx) => {
          manifest += `<item id="s${idx}" href="${f}" media-type="application/xhtml+xml"/>`
        })

        let spine = ""
        sectionFiles.forEach((_, idx) => {
          spine += `<itemref idref="s${idx}"/>`
        })

        const opf =
`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" xml:lang="he">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${xmlEscape(uid)}</dc:identifier>
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:language>he</dc:language>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`
        oebps.file("content.opf", opf)

        const blob = await zip.generateAsync({
          type: "blob",
          mimeType: "application/epub+zip"
        })

        downloadBlob(blob, outName)
      }

      

  window.OtzariaExportEpub = { export: exportEpubFull };
})();
