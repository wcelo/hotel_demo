"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

const HOTEL_NAME = "MESON PANZA VERDE";
const HOTEL_LOCATION = "Antigua, Guatemala";

type VoicePhase = "idle" | "connecting" | "live" | "ended";

function mapServiceError(): string {
  return "We could not start the voice session. Please check your connection and try again.";
}

export default function Home() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const transcriptRef = useRef("");

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new RetellWebClient();
      const c = clientRef.current;
      c.on("call_started", () => {
        setActive(true);
        setPhase("live");
      });
      c.on("call_ended", () => {
        setActive(false);
        setPhase("ended");
        setCaption("");
      });
      c.on("update", (u: { transcript?: string }) => {
        if (u?.transcript) {
          transcriptRef.current = u.transcript;
          setCaption(u.transcript);
        }
      });
      c.on("error", () => {
        setLastError(mapServiceError());
        setActive(false);
        setPhase("idle");
      });
    }
    return clientRef.current;
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
      const data = (await res.json()) as {
        session_token?: string;
        error?: string;
      };
      if (!res.ok || !data.session_token) {
        throw new Error(data.error || "session_failed");
      }
      const client = getClient();
      await client.startCall({ accessToken: data.session_token });
    } catch {
      setLastError(mapServiceError());
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  function stopCall() {
    getClient().stopCall();
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
