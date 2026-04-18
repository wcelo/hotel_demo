"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  timeIso: string;
  summary: string;
  callId: string;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/call-summaries");
      const data = (await res.json()) as { entries?: Entry[] };
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
      setError(null);
    } catch {
      setError("Could not load summaries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">MESON PANZA VERDE</p>
        <h1>Call summaries</h1>
        <p className="lead">
          Staff-facing view of recent call highlights. Entries appear shortly after each
          conversation ends. Data is kept in memory for this demo only.
        </p>
      </section>

      <div className="panel dashPanel">
        <div className="panelHeader">
          <h2>Dashboard</h2>
          <p>Time is shown in Guatemala local time.</p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        {loading && entries.length === 0 ? (
          <p className="dashEmpty">Loading…</p>
        ) : (
          <div className="tableWrap">
            <table className="dashTable">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="dashEmpty">
                      No entries yet. Complete a web call and wait for analysis.
                    </td>
                  </tr>
                ) : (
                  entries.map((r) => (
                    <tr key={r.id}>
                      <td className="dashTime">{formatTime(r.timeIso)}</td>
                      <td className="dashSummary">{r.summary || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
