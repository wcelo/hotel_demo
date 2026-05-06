const express = require("express");
const next = require("next");
const { parse } = require("url");
const Retell = require("retell-sdk").default;
const store = require("./lib/callAnalyzedStore.cjs");
const reservationStore = require("./lib/reservationStore.cjs");

const dev = process.env.NODE_ENV !== "production";
// Railway sets HOSTNAME to the container id — do NOT use it as the bind address or the proxy gets 502.
const listenHost = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server = express();

  server.post(
    "/api/webhooks/retell",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const rawBody = req.body.toString("utf8");
        const signature = req.headers["x-retell-signature"];
        const apiKey = process.env.RETELL_API_KEY;
        if (!apiKey) {
          return res.status(500).send("missing api key");
        }
        const valid = await Retell.verify(rawBody, apiKey, signature);
        if (!valid) {
          return res.status(401).send("Unauthorized");
        }

        const payload = JSON.parse(rawBody);
        // Retell sends `event` in the official payload; some docs mention `event_type` — accept both.
        const ev = payload.event ?? payload.event_type;
        if (ev === "call_analyzed" && payload.call) {
          store.addFromCallAnalyzed(payload.call);
        }

        return res.status(204).end();
      } catch (e) {
        console.error("[webhook]", e);
        return res.status(500).end();
      }
    },
  );

  server.get("/api/call-summaries", (_req, res) => {
    res.json({ entries: store.getRows() });
  });

  // Mock reservation ingestion endpoint for Retell Custom Function.
  // Accepts either direct args body or { args: { ... } } wrapper.
  server.post("/api/reservations/mock", express.json(), (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const payload =
        body && typeof body.args === "object" && body.args !== null ? body.args : body;
      reservationStore.addFromExtract(payload);
      return res.status(201).json({ ok: true });
    } catch (e) {
      console.error("[reservations/mock]", e);
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
  });

  server.get("/api/reservations", (_req, res) => {
    res.json({ entries: reservationStore.getRows() });
  });

  server.delete("/api/dashboard/reset", (req, res) => {
    try {
      const expected = process.env.DASHBOARD_RESET_TOKEN;
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        if (!expected) {
          return res.status(501).json({ ok: false, error: "reset_disabled" });
        }
        const auth = req.headers.authorization;
        const bearer =
          typeof auth === "string" && auth.startsWith("Bearer ")
            ? auth.slice("Bearer ".length).trim()
            : "";
        if (bearer !== expected) {
          return res.status(401).json({ ok: false, error: "unauthorized" });
        }
      }
      store.clearRows();
      reservationStore.clearRows();
      return res.json({ ok: true });
    } catch (e) {
      console.error("[dashboard/reset]", e);
      return res.status(500).json({ ok: false });
    }
  });

  server.use((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    return handle(req, res, parsedUrl);
  });

  server.listen(port, listenHost, () => {
    console.log(`> Ready on http://${listenHost}:${port}`);
  });
});
