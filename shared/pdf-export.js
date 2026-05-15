// ============================================================
// AEO Suite — Shared PDF Export module
//
// Provides the floating "Prepare PDF" trigger button, the slide-out
// customization panel, the preview toolbar, and the print orchestration.
// All three tools (Dashboard, Categorization, Competitor Report) share
// this logic; only the section-toggle list and headline text differ.
//
// Each page sets up the markup (cover, trigger button, side panel) with
// the standard IDs, then calls `PdfExport.init()` once after the report
// renders to wire everything up.
//
// Required markup elements (by ID):
//   #pdfCover, #pdfCoverClient, #pdfCoverIntro
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
    const introEl      = document.getElementById('pdfIntro');
    const clientName = clientNameEl ? (clientNameEl.value || '').trim() : '';
    const intro      = introEl      ? (introEl.value || '').trim()      : '';

    // Cover page
    const cover       = document.getElementById('pdfCover');
    const coverClient = document.getElementById('pdfCoverClient');
    const coverIntro  = document.getElementById('pdfCoverIntro');
    if (cover) {
      if (clientName || intro) {
        if (coverClient) coverClient.innerHTML = clientName ? escapeHtml(clientName) : '';
        if (coverIntro)  coverIntro.textContent = intro;
        cover.classList.add('has-content');
      } else {
        cover.classList.remove('has-content');
      }
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
      +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">'
      +     '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
      +     '<circle cx="12" cy="12" r="3"/>'
      +   '</svg>'
      +   ' PDF Preview'
      + '</div>'
      + '<button class="pdf-preview-btn-secondary" id="pdfExitPreviewBtn" type="button">Exit Preview</button>'
      + '<button class="pdf-preview-btn-primary" id="pdfGenerateFromPreviewBtn" type="button">'
      +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">'
      +     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      +     '<polyline points="7 10 12 15 17 10"/>'
      +     '<line x1="12" y1="15" x2="12" y2="3"/>'
      +   '</svg>'
      +   ' Generate PDF'
      + '</button>';
    document.body.appendChild(bar);
    document.getElementById('pdfExitPreviewBtn').addEventListener('click', () => {
      exitPdfMode();
      hidePreviewToolbar();
    });
    document.getElementById('pdfGenerateFromPreviewBtn').addEventListener('click', () => {
      setTimeout(() => window.print(), 50);
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

    const trigger     = document.getElementById('pdfTriggerBtn');
    const closeBtn    = document.getElementById('pdfPanelClose');
    const backdrop    = document.getElementById('pdfPanelBackdrop');
    const generateBtn = document.getElementById('pdfGenerateBtn');
    const previewBtn  = document.getElementById('pdfPreviewBtn');

    if (trigger)  trigger.addEventListener('click', openPanel);
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
        setTimeout(() => window.print(), 150);
      });
    }

    window.addEventListener('afterprint', () => {
      exitPdfMode();
      hidePreviewToolbar();
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
