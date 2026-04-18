import { NextResponse } from "next/server";

const UPSTREAM_CREATE_SESSION = "https://api.retellai.com/v2/create-web-call";

export async function POST(request: Request) {
  const apiKey = process.env.RETELL_API_KEY;
  const defaultAgentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !defaultAgentId) {
    return NextResponse.json(
      { error: "service_misconfigured" },
      { status: 500 },
    );
  }

  let agentId = defaultAgentId;
  try {
    const body = await request.json().catch(() => ({}));
    if (
      typeof body?.agent_id === "string" &&
      body.agent_id.length > 0 &&
      body.agent_id.length < 200
    ) {
      agentId = body.agent_id;
    }
  } catch {
    // use default
  }

  const res = await fetch(UPSTREAM_CREATE_SESSION, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agent_id: agentId }),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: "session_create_failed" },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  let data: { access_token?: string; call_id?: string };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    return NextResponse.json({ error: "session_create_failed" }, { status: 502 });
  }

  if (!data.access_token) {
    return NextResponse.json({ error: "session_create_failed" }, { status: 502 });
  }

  return NextResponse.json({
    session_token: data.access_token,
    call_id: data.call_id ?? null,
  });
}
