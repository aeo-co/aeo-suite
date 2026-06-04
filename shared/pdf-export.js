// ============================================================
// AEO Suite — Shared PDF Export module
//
// Provides the floating "Prepare PDF" trigger button, the slide-out
// customization panel, the preview toolbar, the AEO.co branded cover
// page, and the per-page running header/footer.
//
// Each report's HTML keeps its old <div class="pdf-cover" id="pdfCover">
// scaffolding — we replace its inner content with the new branded
// structure on init(), so the four report files don't need editing.
// The report title comes from a `data-report-title` attribute on the
// existing #pdfCover element, falling back to the page <title>.
//
// Required markup elements (by ID):
//   #pdfCover  (we replace its contents with the branded cover)
//   #pdfTriggerBtn
//   #pdfPanelBackdrop, #pdfPanel, #pdfPanelClose
//   #pdfClientName, #pdfIntro
//   #pdfToggleList (with <input type="checkbox" data-target="..." />)
//   #pdfGenerateBtn, #pdfPreviewBtn
// ============================================================

(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================
  // Brand markup helpers
  // ============================================================
  // The AEO.co geometric mark — outer circle, inscribed triangle, three
  // dots at the vertices, central rotated diamond. Strokes inherit the
  // current text color so the same SVG works on both dark and light
  // backgrounds. Designed at 100x100 viewBox for clean scaling.
  function aeoLogoSvg() {
    return ''
      + '<svg class="aeo-mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"'
      + ' fill="none" stroke="currentColor" stroke-width="2.4"'
      + ' stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'
      + '<circle cx="50" cy="52" r="32"/>'
      + '<polygon points="50,23 24.5,67 75.5,67"/>'
      + '<circle cx="50" cy="20" r="2.3" fill="currentColor" stroke="none"/>'
      + '<circle cx="22.5" cy="68" r="2.3" fill="currentColor" stroke="none"/>'
      + '<circle cx="77.5" cy="68" r="2.3" fill="currentColor" stroke="none"/>'
      + '<polygon points="50,45 57,52 50,59 43,52"/>'
      + '</svg>';
  }

  // The "smart marketer" wordmark — blue "smart" + green "marketer".
  // Using HTML entity for the middle dot in case host page lacks meta
  // charset declaration. Used in the cover footer band and (text-only)
  // in the @page margin boxes.
  function smartMarketerMark() {
    return ''
      + '<span class="sm-smart">smart</span>'
      + '<span class="sm-dot">&middot;</span>'
      + '<span class="sm-marketer">marketer</span>';
  }

  // Resolve a human-readable report title for the cover.
  // Priority: explicit data-report-title attribute on #pdfCover, then
  // the old `.cover-prepared` text (we strip the " · Prepared for"
  // suffix), then the document <title>.
  function resolveReportTitle() {
    const cover = document.getElementById('pdfCover');
    const attr = cover && cover.getAttribute('data-report-title');
    if (attr) return attr;
    const prepared = cover && cover.querySelector('.cover-prepared');
    if (prepared) {
      return prepared.textContent.replace(/\s*·\s*Prepared for.*$/i, '').trim();
    }
    return (document.title || 'Report').trim();
  }

  // Format today's date as "DD Month YYYY" (e.g. "02 June 2026").
  function formattedToday() {
    try {
      const d = new Date();
      return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch (_e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  // ============================================================
  // Filename for the downloaded PDF
  // ============================================================
  // Browsers use document.title as the suggested filename when the
  // user prints to PDF. We swap it to "ClientName - Report - Date"
  // right before window.print() and restore the original afterwards.
  // Each segment is stripped of filesystem-unsafe characters and has
  // internal whitespace collapsed. If no client name is entered, that
  // segment is dropped entirely (no leading dash).
  function buildPdfFilename() {
    const clientNameEl = document.getElementById('pdfClientName');
    const clientName = clientNameEl ? (clientNameEl.value || '').trim() : '';
    const reportTitle = resolveReportTitle();
    const date = formattedToday();

    const sanitize = (s) => String(s == null ? '' : s)
      .replace(/[\/\\:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const parts = [];
    const cn = sanitize(clientName);
    if (cn) parts.push(cn);
    parts.push(sanitize(reportTitle));
    parts.push(sanitize(date));
    return parts.filter(Boolean).join(' - ');
  }

  // Lazy-capture of the original <title>. Null-guarded so that if a
  // previous afterprint failed to fire, we don't capture the modified
  // title as the new "original" on the next print attempt.
  let originalTitle = null;

  function printWithFilename() {
    if (originalTitle === null) originalTitle = document.title;
    // Compute the new title first, THEN assign — resolveReportTitle()
    // may read document.title as a fallback, so we must read before
    // we write.
    const newTitle = buildPdfFilename();
    document.title = newTitle;
    window.print();
  }

  function restoreOriginalTitle() {
    if (originalTitle !== null) {
      document.title = originalTitle;
      originalTitle = null;
    }
  }

  // Replace the inside of the old cover scaffold with the new branded
  // markup. Called once during init() so report HTML files don't need
  // their cover scaffolds rewritten individually.
  function injectBrandedCover() {
    const cover = document.getElementById('pdfCover');
    if (!cover || cover.dataset.brandInjected === '1') return;
    const reportTitle = resolveReportTitle();
    cover.innerHTML = ''
      + '<div class="pdf-cover-top">'
      + '<div>'
      + '<div class="pdf-cover-brand">'
      + aeoLogoSvg()
      + '<span class="wordmark">AEO<span class="co">.co</span></span>'
      + '</div>'
      + '<div class="pdf-cover-poweredby">Powered by <span class="sm-mark">smart &middot; marketer</span></div>'
      + '</div>'
      + '<div class="pdf-cover-tagline">ANSWER ENGINE OPTIMIZATION</div>'
      + '</div>'
      + '<div class="pdf-cover-title-block">'
      + '<div class="pdf-cover-accent"></div>'
      + '<h1 class="pdf-cover-title" id="pdfCoverTitle">' + escapeHtml(reportTitle) + '</h1>'
      + '<div class="pdf-cover-subtitle" id="pdfCoverIntro"></div>'
      + '</div>'
      + '<div class="pdf-cover-foot">'
      + '<div>'
      + '<div class="label">Client</div>'
      + '<div class="value" id="pdfCoverClient"></div>'
      + '</div>'
      + '<div>'
      + '<div class="label">Format</div>'
      + '<div class="value" id="pdfCoverFormat">' + escapeHtml(reportTitle) + ' &middot; ' + escapeHtml(formattedToday()) + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="pdf-cover-band">'
      + '<div class="left">AEO.CO</div>'
      + '<div class="mid">' + smartMarketerMark() + '</div>'
      + '<div class="right">platform.aeo.co</div>'
      + '</div>';
    cover.dataset.brandInjected = '1';
  }

  // Running header and footer are handled by @page margin boxes in
  // tokens.css — Chrome reliably places them on every printed page
  // and suppresses them on the first page (the cover). This used to be
  // a DOM injection of fixed-position elements, but Chrome doesn't
  // place position:fixed bottoms reliably across pages. The @page
  // approach is text-only (no SVG logo on inner pages), but it's
  // robust. Kept here as a no-op for backwards safety.
  function injectRunningChrome() { /* no-op — see CSS @page rules */ }

  function openPanel() {
    const panel = document.getElementById('pdfPanel');
    const backdrop = document.getElementById('pdfPanelBackdrop');
    if (!panel || !backdrop) return;
    panel.classList.add('open');
    backdrop.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    const panel = document.getElementById('pdfPanel');
    const backdrop = document.getElementById('pdfPanelBackdrop');
    if (!panel || !backdrop) return;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function applyPdfMode() {
    const clientNameEl = document.getElementById('pdfClientName');
    const introEl = document.getElementById('pdfIntro');
    const clientName = clientNameEl ? (clientNameEl.value || '').trim() : '';
    const intro = introEl ? (introEl.value || '').trim() : '';

    // Cover page — the branded markup was injected once during init().
    // Here we just write in the dynamic content (client name + intro).
    const cover = document.getElementById('pdfCover');
    const coverClient = document.getElementById('pdfCoverClient');
    const coverIntro = document.getElementById('pdfCoverIntro');
    if (cover) {
      // The cover always shows now (not gated on has-content) because
      // even an empty client name gives a meaningful branded title page.
      // We do still want to skip rendering it if the user explicitly
      // unticked the "Cover page" toggle.
      if (coverClient) coverClient.textContent = clientName || '—';
      if (coverIntro) coverIntro.textContent = intro;
      cover.classList.add('has-content');
    }

    // Section toggles — hide unchecked sections
    const toggles = document.querySelectorAll('#pdfToggleList input[type="checkbox"]');
    toggles.forEach(t => {
      const target = document.getElementById(t.dataset.target);
      if (!target) return;
      if (t.checked) target.classList.remove('hidden-for-pdf');
      else target.classList.add('hidden-for-pdf');
    });

    document.body.classList.add('pdf-mode');
  }

  function exitPdfMode() {
    document.body.classList.remove('pdf-mode');
    // Section-hidden classes are left in place — they're inert without
    // .pdf-mode on body, and let users iterate without re-checking boxes.
  }

  function showPreviewToolbar() {
    if (document.getElementById('pdfPreviewToolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'pdfPreviewToolbar';
    bar.className = 'pdf-preview-toolbar';
    bar.innerHTML = ''
      + '<div class="pdf-preview-toolbar-label">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">'
      + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
      + '<circle cx="12" cy="12" r="3"/>'
      + '</svg>'
      + ' PDF Preview'
      + '</div>'
      + '<button class="pdf-preview-btn-secondary" id="pdfExitPreviewBtn" type="button">Exit Preview</button>'
      + '<button class="pdf-preview-btn-primary" id="pdfGenerateFromPreviewBtn" type="button">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      + '<polyline points="7 10 12 15 17 10"/>'
      + '<line x1="12" y1="15" x2="12" y2="3"/>'
      + '</svg>'
      + ' Generate PDF'
      + '</button>';
    document.body.appendChild(bar);
    document.getElementById('pdfExitPreviewBtn').addEventListener('click', () => {
      exitPdfMode();
      hidePreviewToolbar();
    });
    document.getElementById('pdfGenerateFromPreviewBtn').addEventListener('click', () => {
      setTimeout(() => printWithFilename(), 50);
    });
  }

  function hidePreviewToolbar() {
    const bar = document.getElementById('pdfPreviewToolbar');
    if (bar) bar.remove();
  }

  let isWired = false;
  function init() {
    if (isWired) return;
    isWired = true;

    // Inject the branded cover content and the running header/footer
    // into the DOM once. They stay there permanently — CSS hides them
    // until body.pdf-mode is active.
    injectBrandedCover();
    injectRunningChrome();

    const trigger = document.getElementById('pdfTriggerBtn');
    const closeBtn = document.getElementById('pdfPanelClose');
    const backdrop = document.getElementById('pdfPanelBackdrop');
    const generateBtn = document.getElementById('pdfGenerateBtn');
    const previewBtn = document.getElementById('pdfPreviewBtn');

    if (trigger) trigger.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (backdrop) backdrop.addEventListener('click', closePanel);

    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        applyPdfMode();
        closePanel();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showPreviewToolbar();
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        applyPdfMode();
        closePanel();
        setTimeout(() => printWithFilename(), 150);
      });
    }

    window.addEventListener('afterprint', () => {
      exitPdfMode();
      hidePreviewToolbar();
      restoreOriginalTitle();
    });
  }

  // Reveal the floating trigger button — call this once the report is
  // rendered, since there's nothing to export before then.
  function showTrigger() {
    const trigger = document.getElementById('pdfTriggerBtn');
    if (trigger) trigger.classList.remove('hidden');
  }

  // Pre-fill the client name field — call this once the brand is known.
  function prefillClientName(brand) {
    const input = document.getElementById('pdfClientName');
    if (input && !input.value && brand) input.value = brand;
  }

  window.PdfExport = {
    init: init,
    showTrigger: showTrigger,
    prefillClientName: prefillClientName,
  };
})();