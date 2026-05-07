/* ============================================================
   AEO Suite — Shared State
   Passes data between tools via sessionStorage.
   All keys are namespaced with 'aeo:' to avoid collisions.
   ============================================================ */

const ToolState = {
  PREFIX: 'aeo:',

  /**
   * Store a value. Objects/arrays are JSON-serialized.
   * Uses localStorage so data is shared across tabs on the same origin.
   */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[ToolState] set failed:', err);
      return false;
    }
  },

  /**
   * Retrieve a value. Returns null if missing or unparseable.
   */
  get(key) {
    const raw = localStorage.getItem(this.PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  /**
   * Check whether a key exists.
   */
  has(key) {
    return localStorage.getItem(this.PREFIX + key) !== null;
  },

  /**
   * Remove one key.
   */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /**
   * Clear ALL aeo:* keys. Other apps' data on the same origin is untouched.
   */
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  /**
   * Navigate to another tool, optionally setting state in the same call.
   *   ToolState.goTo('competitor-report.html', { rows: [...], brand: 'X' })
   */
  goTo(path, payload = {}) {
    Object.entries(payload).forEach(([k, v]) => this.set(k, v));
    window.location.href = path;
  },

  /**
   * Convenience: get the current scan context if it exists.
   * Returns { brand, queries, rows } or null.
   */
  getScanContext() {
    if (!this.has('rows')) return null;
    return {
      brand:   this.get('brand')   || '',
      queries: this.get('queries') || [],
      rows:    this.get('rows')    || [],
      runAt:   this.get('runAt')   || null,
    };
  },
};

// Expose globally so non-module pages can use it.
window.ToolState = ToolState;