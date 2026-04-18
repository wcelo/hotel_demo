/**
 * In-memory store for call_analyzed webhook rows (shared with Express + same Node process).
 * @type {Array<{ id: string; timeIso: string; summary: string; callId: string }>}
 */
const rows = [];

const MAX = 500;

/**
 * Prefer post_call_analysis.summary (per product naming); fall back to call_analysis.call_summary.
 * @param {Record<string, unknown>} call
 */
function extractSummary(call) {
  if (!call || typeof call !== "object") return "";
  const post = call.post_call_analysis;
  if (post && typeof post === "object") {
    const s = /** @type {{ summary?: unknown }} */ (post).summary;
    if (typeof s === "string") return s;
    if (s != null) return String(s);
  }
  const ca = call.call_analysis;
  if (ca && typeof ca === "object") {
    const cs = /** @type {{ call_summary?: unknown }} */ (ca).call_summary;
    if (typeof cs === "string") return cs;
    if (cs != null) return String(cs);
  }
  const tr = call.transcript;
  if (typeof tr === "string" && tr.trim()) {
    const one = tr.trim().replace(/\s+/g, " ");
    return one.length > 220 ? `${one.slice(0, 220)}…` : one;
  }
  return "";
}

/**
 * @param {Record<string, unknown>} call
 */
function addFromCallAnalyzed(call) {
  const callId = typeof call.call_id === "string" ? call.call_id : "";
  const summary = extractSummary(call);
  const timeIso =
    typeof call.end_timestamp === "number"
      ? new Date(call.end_timestamp).toISOString()
      : new Date().toISOString();

  rows.unshift({
    id: `${callId || "call"}-${Date.now()}`,
    timeIso,
    summary,
    callId,
  });
  if (rows.length > MAX) rows.length = MAX;
}

function getRows() {
  return rows.map((r) => ({ ...r }));
}

module.exports = { addFromCallAnalyzed, getRows };
