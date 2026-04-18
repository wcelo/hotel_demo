const express = require("express");
const next = require("next");
const { parse } = require("url");
const Retell = require("retell-sdk").default;
const store = require("./lib/callAnalyzedStore.cjs");

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

  server.use((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    return handle(req, res, parsedUrl);
  });

  server.listen(port, listenHost, () => {
    console.log(`> Ready on http://${listenHost}:${port}`);
  });
});
