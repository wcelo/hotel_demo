import { NextResponse } from "next/server";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Body = {
  hotel_name?: string;
  summary_lines?: unknown;
};

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.FRONT_DESK_EMAIL;

  if (!key || !from || !to) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 501 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const hotel = typeof body.hotel_name === "string" ? body.hotel_name.trim() : "";
  const lines = Array.isArray(body.summary_lines)
    ? body.summary_lines.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  if (!lines.length) {
    return NextResponse.json({ error: "empty_summary" }, { status: 400 });
  }

  const subject = hotel
    ? `Guest call summary — ${hotel}`
    : "Guest call summary";

  const listHtml = `<ul style="margin:0;padding-left:1.2rem;">${lines
    .map((l) => `<li style="margin:0.35rem 0;">${escapeHtml(l)}</li>`)
    .join("")}</ul>`;

  const html = `
  <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;">
    <p style="margin:0 0 0.75rem;">${hotel ? `<strong>${escapeHtml(hotel)}</strong><br/>` : ""}
    A guest call just ended. Here is the on-screen summary shared with the guest:</p>
    ${listHtml}
    <p style="margin:1rem 0 0;font-size:0.9rem;color:#555;">This message was sent from your hotel demo site.</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "email_send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
