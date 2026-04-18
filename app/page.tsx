"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

type LogLine = string;

export default function Home() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const append = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-80), `[${new Date().toISOString()}] ${line}`]);
  }, []);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new RetellWebClient();
      const c = clientRef.current;
      c.on("call_started", () => {
        setActive(true);
        append("event: call_started");
      });
      c.on("call_ended", () => {
        setActive(false);
        append("event: call_ended");
      });
      c.on("agent_start_talking", () => append("event: agent_start_talking"));
      c.on("agent_stop_talking", () => append("event: agent_stop_talking"));
      c.on("update", (u: { transcript?: string }) => {
        if (u?.transcript) append(`transcript: ${u.transcript}`);
      });
      c.on("error", (err: Error) => {
        append(`error: ${err?.message || String(err)}`);
        setLastError(err?.message || String(err));
        setActive(false);
      });
    }
    return clientRef.current;
  }, [append]);

  useEffect(() => {
    return () => {
      clientRef.current?.stopCall();
      clientRef.current = null;
    };
  }, []);

  async function startCall() {
    setLastError(null);
    setBusy(true);
    append("requesting access_token from /api/retell/web-call …");
    try {
      const res = await fetch("/api/retell/web-call", { method: "POST" });
      const data = (await res.json()) as {
        access_token?: string;
        call_id?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      if (!data.access_token) {
        throw new Error("No access_token in response");
      }
      append(`got token; call_id=${data.call_id ?? "n/a"} — starting WebRTC …`);
      const client = getClient();
      await client.startCall({ accessToken: data.access_token });
      append("startCall() resolved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      append(`failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  function stopCall() {
    append("user: stopCall()");
    getClient().stopCall();
    setActive(false);
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Railway-ready demo</p>
        <h1>Hotel Voice Concierge</h1>
        <p className="lead">
          This page creates a secure Retell web call token on the server, then
          starts the browser call with the SDK. Configure your Railway Variables
          first using values in <code>env.example</code>.
        </p>
      </section>

      <div className="panel">
        <div className="panelHeader">
          <h2>Call Controls</h2>
          <p>Start a conversation and monitor real-time events below.</p>
        </div>

        <div className="row">
          <button
            type="button"
            className="primary"
            disabled={busy || active}
            onClick={() => void startCall()}
          >
            {busy ? "Connecting..." : "Start Call"}
          </button>
          <button
            type="button"
            className="danger"
            disabled={!active}
            onClick={stopCall}
          >
            End Call
          </button>
        </div>

        {lastError ? <div className="error">{lastError}</div> : null}

        <pre className="log">{logs.length ? logs.join("\n") : "No events yet."}</pre>
      </div>
    </main>
  );
}
