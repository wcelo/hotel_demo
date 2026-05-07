/**
 * In-memory store for reservation-like rows from Retell custom function calls.
 * @type {Array<{
 *  id: string;
 *  timeIso: string;
 *  callId: string;
 *  guestName: string;
 *  guestPhone: string;
 *  guestTitle: string;
 *  selectedRestaurantName: string;
 *  bookingDate: string;
 *  bookingTime: string;
 *  adultCount: string;
 *  childCount: string;
 *  specialRequests: string;
 *  raw: Record<string, unknown>;
 * }>}
 */
const rows = [];

const MAX = 500;

/**
 * @param {unknown} v
 */
function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/**
 * @param {unknown} value
 */
function normalizeIntent(value) {
  const s = toText(value).toLowerCase();
  if (["yes", "y", "true", "1", "book", "booking", "confirm"].includes(s)) return "yes";
  if (["no", "n", "false", "0"].includes(s)) return "no";
  return s || "unknown";
}

/**
 * @param {Record<string, unknown>} raw
 */
function addFromExtract(raw) {
  const callId = toText(raw.call_id || raw.callId);
  const guestName = toText(raw.guest_name || raw.guestName || raw.name);
  const bookingIntent = normalizeIntent(raw.booking_intent || raw.bookingIntent || "yes");
  if (bookingIntent === "no") return;
  const guestPhone = toText(raw.guest_phone || raw.phone || raw.phone_number);
  const guestTitle = toText(raw.guest_title);
  const selectedRestaurantName = toText(raw.selected_restaurant_name);
  // Prefer correct spelling; accept legacy typo from older Retell payloads.
  const bookingDate = toText(raw.booking_date || raw.boking_date);
  const bookingTime = toText(raw.booking_time || raw.boking_time);
  const adultCount = toText(raw.adult_count);
  const childCount = toText(raw.child_count);
  const specialRequests = toText(raw.special_requests || raw.special_request);

  rows.unshift({
    id: `${callId || "reservation"}-${Date.now()}`,
    timeIso: new Date().toISOString(),
    callId,
    guestName,
    guestPhone,
    guestTitle,
    selectedRestaurantName,
    bookingDate,
    bookingTime,
    adultCount,
    childCount,
    specialRequests,
    raw: { ...raw },
  });

  if (rows.length > MAX) rows.length = MAX;
}

function getRows() {
  return rows.map((r) => ({ ...r, raw: { ...r.raw } }));
}

function clearRows() {
  rows.length = 0;
}

module.exports = { addFromExtract, getRows, clearRows };
