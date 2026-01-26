(function(){
// ---------- DOCX ----------
      // Adds word/settings.xml + uses one-line TOC (hyperlinks separated by " | ")
      function docxXmlEscape(s){
        return xmlEscape(s)
      }

      function docxContentTypesXml() {
        return (
`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
        )
      }

      function docxRootRelsXml() {
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
        )
      }

      function docxDocumentRelsXml() {
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`
        )
      }

      function docxSettingsXml() {
        // This is the piece that usually fixes "Word still LTR"
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:mirrorMargins/>
  <w:rtlGutter/>
  <w:themeFontLang w:val="en-US" w:bidi="he-IL"/>
  <w:bidi/>
</w:settings>`
        )
      }

      function docxStylesXml() {
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="right"/><w:bidi/></w:pPr>
    <w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="right"/><w:bidi/><w:spacing w:before="240" w:after="80"/></w:pPr>
    <w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="right"/><w:bidi/><w:spacing w:before="200" w:after="70"/></w:pPr>
    <w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="right"/><w:bidi/><w:spacing w:before="180" w:after="60"/></w:pPr>
    <w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/><w:b/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="right"/><w:bidi/><w:spacing w:before="160" w:after="50"/></w:pPr>
    <w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr>
  </w:style>

  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:uiPriority w:val="99"/>
    <w:unhideWhenUsed/>
    <w:rPr><w:color w:val="0000FF"/><w:u w:val="single"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>
  </w:style>
</w:styles>`
        )
      }

      function docxCoreXml(title) {
        const nowIso = new Date().toISOString()
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${docxXmlEscape(title)}</dc:title>
  <dc:language>he-IL</dc:language>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
</cp:coreProperties>`
        )
      }

      function docxAppXml() {
        return (
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>otzaria-web</Application>
</Properties>`
        )
      }

      function normalizeSpacesKeepNewlines(s) {
        const x = String(s || "").replace(/\r\n/g, "\n")
        return x
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n[ \t]+/g, "\n")
      }

      function splitToParagraphs(text) {
        const t = normalizeSpacesKeepNewlines(text)
        const parts = t.split(/\n\s*\n+/g)
        return parts
          .map(p => p.replace(/\n+/g, " ").trim())
          .filter(p => p.length > 0)
      }

      function textFromNode(node) {
        let out = ""
        function walk(n) {
          if (!n) return
          if (n.nodeType === Node.TEXT_NODE) {
            out += n.nodeValue || ""
            return
          }
          if (n.nodeType === Node.ELEMENT_NODE) {
            const tag = (n.tagName || "").toUpperCase()
            if (tag === "BR") { out += " "; return }
            if (tag === "SCRIPT" || tag === "STYLE") return
            for (const c of Array.from(n.childNodes || [])) walk(c)
          }
        }
        walk(node)
        return out
      }

      function collectBlocksForDocx(root) {
        const blocks = []
        let buffer = ""

        function flush() {
          const paras = splitToParagraphs(buffer)
          paras.forEach((p) => blocks.push({ type: "p", text: p }))
          buffer = ""
        }

        function walk(node) {
          if (!node) return
          if (node.nodeType === Node.TEXT_NODE) {
            buffer += node.nodeValue || ""
            return
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return

          const tag = (node.tagName || "").toUpperCase()

          if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
            flush()
            const lvl = Number(tag.slice(1))
            const t = (node.textContent || "").replace(/\s+/g, " ").trim()
            if (t) blocks.push({ type: "h", level: lvl, text: t })
            return
          }

          if (tag === "P" || tag === "BLOCKQUOTE" || tag === "PRE") {
            flush()
            const t = textFromNode(node).replace(/\s+/g, " ").trim()
            if (t) blocks.push({ type: "p", text: t })
            return
          }

          if (tag === "LI") {
            flush()
            const t = textFromNode(node).replace(/\s+/g, " ").trim()
            if (t) blocks.push({ type: "p", text: "• " + t })
            return
          }

          for (const c of Array.from(node.childNodes || [])) walk(c)
          if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") buffer += "\n\n"
        }

        walk(root)
        flush()
        return blocks
      }

      function docxRun(text, opts) {
        const o = opts || {}
        const rtl = "<w:rtl/>"
        const lang = "<w:lang w:val=\"he-IL\" w:bidi=\"he-IL\"/>"
        const b = o.bold ? "<w:b/>" : ""
        const rStyle = o.rStyle ? "<w:rStyle w:val=\"" + o.rStyle + "\"/>" : ""
        return (
          "<w:r><w:rPr>" + rtl + lang + b + rStyle + "</w:rPr>" +
          "<w:t xml:space=\"preserve\">" + docxXmlEscape(text) + "</w:t></w:r>"
        )
      }

      function docxPPr(pStyle, spacingAfterTwips) {
        const jc = "<w:jc w:val=\"right\"/>"
        const bidi = "<w:bidi/>"
        const style = pStyle ? "<w:pStyle w:val=\"" + pStyle + "\"/>" : ""
        const spacing = "<w:spacing w:after=\"" + String(spacingAfterTwips ?? 80) + "\"/>"
        return "<w:pPr>" + style + jc + bidi + spacing + "</w:pPr>"
      }

      function docxPara(pStyle, text, bold) {
        return "<w:p>" + docxPPr(pStyle, 80) + docxRun(text, { bold: !!bold }) + "</w:p>"
      }

      function docxBookmarkStart(id, name) {
        return "<w:bookmarkStart w:id=\"" + id + "\" w:name=\"" + docxXmlEscape(name) + "\"/>"
      }

      function docxBookmarkEnd(id) {
        return "<w:bookmarkEnd w:id=\"" + id + "\"/>"
      }

      function docxHeadingWithBookmark(level, text, bmId, bmName) {
        const lvl = clamp(Number(level || 1), 1, 4)
        const style = "Heading" + lvl
        return (
          "<w:p>" +
            docxPPr(style, 80) +
            docxBookmarkStart(bmId, bmName) +
            docxRun(text, { bold: true }) +
            docxBookmarkEnd(bmId) +
          "</w:p>"
        )
      }

      function docxHyperlinkAnchor(anchorName, label) {
        return (
          "<w:hyperlink w:anchor=\"" + docxXmlEscape(anchorName) + "\" w:history=\"1\">" +
            docxRun(label, { rStyle: "Hyperlink" }) +
          "</w:hyperlink>"
        )
      }

      function docxPageBreak() {
        return "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"
      }

      function docxSectPr() {
        // rtlGutter inside section
        return "<w:sectPr><w:rtlGutter/></w:sectPr>"
      }

      function docxOneLineTocParagraph(tocEntries) {
        // One paragraph with many hyperlinks separated by " | "
        // It will wrap naturally in Word if too long.
        let p = "<w:p>" + docxPPr("Normal", 80)

        p += docxRun("תוכן עניינים: ", { bold: true })

        for (let i = 0; i < tocEntries.length; i++) {
          const e = tocEntries[i]
          const prefix = e.level > 1 ? ("»".repeat(Math.min(4, e.level - 1)) + " ") : ""
          p += docxHyperlinkAnchor(e.bmName, prefix + e.label)
          if (i !== tocEntries.length - 1) p += docxRun(" | ", {})
        }

        p += "</w:p>"
        return p
      }

      async function exportDocxFull() {
        if (!requireJSZip()) return

        const title = getTitleFromDom()
        const outName = fileStem(baseNameFromPath(currentPath)) + ".docx"

        const root = document.getElementById("content")
        let blocks = []

        if (root && root.style.display !== "none") {
          blocks = collectBlocksForDocx(root)
        } else {
          const paras = splitToParagraphs(currentPlainText || "")
          blocks = paras.map(p => ({ type: "p", text: p }))
          if (!blocks.length) blocks = [{ type:"p", text:"(ריק)" }]
        }

        let bmId = 1
        const tocEntries = []
        let bodyContent = ""

        blocks.forEach((b) => {
          if (b.type === "h") {
            const lvl = clamp(Number(b.level || 1), 1, 4)
            const bmName = "bm_" + bmId
            tocEntries.push({ label: b.text, level: lvl, bmName, bmId })
            bodyContent += docxHeadingWithBookmark(lvl, b.text, bmId, bmName)
            bmId++
          } else {
            bodyContent += docxPara("Normal", b.text, false)
          }
        })

        const tocPara = tocEntries.length
          ? docxOneLineTocParagraph(tocEntries)
          : docxPara("Normal", "תוכן עניינים: (אין כותרות)", true)

        const documentXml =
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docxPara("Heading1", title, true)}
    ${tocPara}
    ${docxPageBreak()}
    ${bodyContent}
    ${docxSectPr()}
  </w:body>
</w:document>`

        const zip = new JSZip()
        zip.file("[Content_Types].xml", docxContentTypesXml())

        zip.folder("_rels").file(".rels", docxRootRelsXml())
        zip.folder("word").file("document.xml", documentXml)
        zip.folder("word").file("styles.xml", docxStylesXml())
        zip.folder("word").file("settings.xml", docxSettingsXml())
        zip.folder("word").folder("_rels").file("document.xml.rels", docxDocumentRelsXml())

        zip.folder("docProps").file("core.xml", docxCoreXml(title))
        zip.folder("docProps").file("app.xml", docxAppXml())

        const blob = await zip.generateAsync({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })

        downloadBlob(blob, outName)
      }

      

  window.OtzariaExportDocx = { export: exportDocxFull };
})();
