"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  timeIso: string;
  summary: string;
  callId: string;
};

type ReservationEntry = {
  id: string;
  timeIso: string;
  callId: string;
  guestName: string;
  guestPhone: string;
  guestTitle: string;
  selectedRestaurantName: string;
  bokingDate: string;
  bokingTime: string;
  adultCount: string;
  childCount: string;
  specialRequests: string;
};

function csvEscape(v: string) {
  const s = v ?? "";
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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
  const [reservations, setReservations] = useState<ReservationEntry[]>([]);
  const [view, setView] = useState<"summaries" | "reservations">("reservations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function exportReservationsCsv() {
    const header = [
      "time",
      "guest_name",
      "guest_phone",
      "guest_title",
      "selected_restaurant_name",
      "boking_date",
      "boking_time",
      "adult_count",
      "child_count",
      "special_requests",
    ];
    const rows = reservations.map((r) => [
      r.timeIso || "",
      r.guestName || "",
      r.guestPhone || "",
      r.guestTitle || "",
      r.selectedRestaurantName || "",
      r.bokingDate || "",
      r.bokingTime || "",
      r.adultCount || "",
      r.childCount || "",
      r.specialRequests || "",
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => csvEscape(cell)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const load = useCallback(async () => {
    try {
      const [summaryRes, reservationRes] = await Promise.all([
        fetch("/api/call-summaries"),
        fetch("/api/reservations"),
      ]);
      const summaryData = (await summaryRes.json()) as { entries?: Entry[] };
      const reservationData = (await reservationRes.json()) as { entries?: ReservationEntry[] };
      if (Array.isArray(summaryData.entries)) {
        setEntries(summaryData.entries);
      }
      if (Array.isArray(reservationData.entries)) {
        setReservations(reservationData.entries);
      }
      setError(null);
    } catch {
      setError("Could not load dashboard data.");
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
        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="dash-view" style={{ fontWeight: 600 }}>
            View:
          </label>
          <select
            id="dash-view"
            value={view}
            onChange={(e) => setView(e.target.value as "summaries" | "reservations")}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="reservations">Reservations</option>
            <option value="summaries">Call summaries</option>
          </select>
          {view === "reservations" ? (
            <button
              type="button"
              className="primary"
              onClick={exportReservationsCsv}
              style={{ marginLeft: "0.75rem" }}
            >
              Export CSV
            </button>
          ) : null}
        </div>

        {error ? <div className="error">{error}</div> : null}

        {loading && entries.length === 0 && reservations.length === 0 ? (
          <p className="dashEmpty">Loading…</p>
        ) : (
          <div className="tableWrap">
            {view === "summaries" ? (
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
                        No call summaries yet.
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
            ) : (
              <table className="dashTable">
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">guest_name</th>
                    <th scope="col">guest_phone</th>
                    <th scope="col">guest_title</th>
                    <th scope="col">selected_restaurant_name</th>
                    <th scope="col">boking_date</th>
                    <th scope="col">boking_time</th>
                    <th scope="col">adult_count</th>
                    <th scope="col">child_count</th>
                    <th scope="col">special_requests</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="dashEmpty">
                        No reservations yet. Trigger your Retell custom function first.
                      </td>
                    </tr>
                  ) : (
                    reservations.map((r) => (
                      <tr key={r.id}>
                        <td className="dashTime">{formatTime(r.timeIso)}</td>
                        <td>{r.guestName || ""}</td>
                        <td>{r.guestPhone || ""}</td>
                        <td>{r.guestTitle || ""}</td>
                        <td>{r.selectedRestaurantName || ""}</td>
                        <td>{r.bokingDate || ""}</td>
                        <td>{r.bokingTime || ""}</td>
                        <td>{r.adultCount || ""}</td>
                        <td>{r.childCount || ""}</td>
                        <td>{r.specialRequests || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
