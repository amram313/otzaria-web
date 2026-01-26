(function(){
// ---------- PDF (print) ----------
      // NOTE: internal # links often do NOT become clickable in Print-to-PDF.
      // We generate external links to your viewer: /view?path=...#id (these are usually clickable).
      function exportPdfWithPrintedToc() {
        const card = document.getElementById("card")
        const old = document.getElementById("printToc")
        if (old) old.remove()

        const items = Array.isArray(currentTocItems) ? currentTocItems : []
        const toc = document.createElement("div")
        toc.id = "printToc"
        toc.className = "printToc"

        const base = location.origin + "/view?path=" + encodeURIComponent(currentPath)

        let html = "<h1>תוכן עניינים</h1>"
        if (items.length) {
          html += "<ol>"
          items.forEach((it) => {
            const indent = (Math.max(1, it.level) - 1) * 14
            const url = base + "#" + encodeURIComponent(it.id)
            html += (
              "<li style=\"margin-right:" + indent + "px\">" +
                "<a href=\"" + url + "\">" + xmlEscape(it.label) + "</a>" +
              "</li>"
            )
          })
          html += "</ol>"
        } else {
          html += "<div style=\"color:#666\">(אין כותרות)</div>"
        }
        html += "<div class=\"printBreak\"></div>"

        toc.innerHTML = html
        card.insertBefore(toc, card.firstChild)

        const cleanup = () => {
          const x = document.getElementById("printToc")
          if (x) x.remove()
          window.removeEventListener("afterprint", cleanup)
        }
        window.addEventListener("afterprint", cleanup)

        window.print()
      }

      

  window.OtzariaExportPdf = { export: exportPdfWithPrintedToc };
})();
