"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

const HOTEL_NAME = "MESON PANZA VERDE";
const HOTEL_LOCATION = "Antigua, Guatemala";

type VoicePhase = "idle" | "connecting" | "live" | "ended";

function mapServiceError(): string {
  return "We could not start the voice session. Please check your connection and try again.";
}

/** Retell `update` payloads may send `transcript` as a string or structured object — React cannot render objects. */
function transcriptToDisplayText(transcript: unknown): string {
  if (transcript == null) return "";
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((item) => transcriptToDisplayText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof transcript === "object") {
    const o = transcript as Record<string, unknown>;
    if (typeof o.content === "string") return o.content;
    if (typeof o.text === "string") return o.text;
    if (typeof o.message === "string") return o.message;
    if (typeof o.transcript === "string") return o.transcript;
    const role = typeof o.role === "string" ? o.role : "";
    const line =
      typeof o.content === "string"
        ? o.content
        : typeof o.text === "string"
          ? o.text
          : "";
    if (role && line) return `${role}: ${line}`;
    if (line) return line;
    if (role) return role;
    try {
      return JSON.stringify(o);
    } catch {
      return "";
    }
  }
  return String(transcript);
}

export default function RetellHome() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const transcriptRef = useRef("");

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { RetellWebClient: Client } = await import("retell-client-js-sdk");
    const c = new Client();
    c.on("call_started", () => {
      setActive(true);
      setPhase("live");
    });
    c.on("call_ended", () => {
      setActive(false);
      setPhase("ended");
      setCaption("");
    });
    c.on("update", (u: unknown) => {
      if (!u || typeof u !== "object") return;
      const raw = (u as Record<string, unknown>).transcript;
      const text = transcriptToDisplayText(raw);
      if (text) {
        transcriptRef.current = text;
        setCaption(text);
      }
    });
    c.on("error", () => {
      setLastError(mapServiceError());
      setActive(false);
      setPhase("idle");
    });
    clientRef.current = c;
    return c;
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.stopCall();
      clientRef.current = null;
    };
  }, []);

  async function startCall() {
    setLastError(null);
    setCaption("");
    transcriptRef.current = "";
    setBusy(true);
    setPhase("connecting");
    try {
      const res = await fetch("/api/voice-session", { method: "POST" });
      const text = await res.text();
      let data: { session_token?: string; error?: string };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error("invalid_response");
      }
      if (!res.ok || !data.session_token) {
        throw new Error(data.error || "session_failed");
      }
      const client = await ensureClient();
      await client.startCall({ accessToken: data.session_token });
    } catch {
      setLastError(mapServiceError());
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  function stopCall() {
    clientRef.current?.stopCall();
    setActive(false);
    setPhase("ended");
    setCaption("");
  }

  const statusLabel =
    phase === "connecting"
      ? "Connecting"
      : phase === "live"
        ? "In conversation"
        : phase === "ended"
          ? "Call ended"
          : "Ready";

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">{HOTEL_LOCATION}</p>
        <h1>AI Receptionist — {HOTEL_NAME}</h1>
        <p className="lead">
          Welcome to our voice concierge preview for {HOTEL_NAME}. Guests can ask about
          breakfast, parking, local recommendations, and front-desk requests—handled with
          the same warmth as our team at the lobby.
        </p>
      </section>

      <div className="panel">
        <div className="panelHeader">
          <h2>Voice conversation</h2>
          <p>
            Start a call to speak with the receptionist. Live captions appear below while
            you are connected.
          </p>
        </div>

        <div className="voiceShell">
          <div className="voiceStatusRow">
            <span className={`voicePill voicePill--${phase}`}>{statusLabel}</span>
            {active ? <span className="voiceHint">Speak naturally—this is a demo.</span> : null}
          </div>

          <div className={`voiceOrb ${active ? "voiceOrb--live" : ""}`} aria-hidden>
            <span className="voiceOrbRing" />
            <span className="voiceOrbCore" />
            <span className="voiceOrbRing voiceOrbRing--delay" />
          </div>

          <div className="voiceCaptions" aria-live="polite">
            {caption ? (
              <p className="voiceCaptionText">{caption}</p>
            ) : (
              <p className="voiceCaptionPlaceholder">
                {phase === "connecting"
                  ? "Preparing your session…"
                  : phase === "live"
                    ? "Listening… captions will appear here."
                    : phase === "ended"
                      ? "Session closed."
                      : "Captions will appear when the call is active."}
              </p>
            )}
          </div>

          <div className="row voiceActions">
            <button
              type="button"
              className="primary"
              disabled={busy || active}
              onClick={() => void startCall()}
            >
              {busy ? "Connecting…" : "Start call"}
            </button>
            <button type="button" className="danger" disabled={!active} onClick={stopCall}>
              End call
            </button>
          </div>

          {lastError ? <div className="error">{lastError}</div> : null}
        </div>
      </div>
    </main>
  );
}
