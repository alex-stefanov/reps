/**
 * Mock Claude Messages API for e2e runs. The app's SDK points here via
 * ANTHROPIC_BASE_URL; this returns canned structured-output responses so the
 * Phase 3 AI assists (receipt scan, brainstorm) can be proven end to end
 * without a key or a bill. It never touches production code paths, which hit
 * api.anthropic.com. Branches on the request's JSON schema: receipts ask for
 * `amountCents`, brainstorm asks for `reply`/`suggestions`.
 */
import http from "node:http";

function messageEnvelope(jsonText: string) {
  return {
    id: "msg_e2e",
    type: "message",
    role: "assistant",
    model: "claude-opus-4-8",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    content: [{ type: "text", text: jsonText }],
  };
}

const RECEIPT = JSON.stringify({
  amountCents: 1299,
  categoryName: "Food",
  merchant: "Gelateria Roma",
});

const BRAINSTORM = JSON.stringify({
  reply: "Love it — here's a strong one to start:",
  suggestions: [
    {
      // Deliberately not a curated-seed name, so the e2e assertion is unambiguous.
      name: "Realtime multiplayer backend",
      type: "project",
      description:
        "Authoritative game server with rollback netcode over a WebSocket transport.",
      hours: 45,
    },
  ],
});

const server = http.createServer((req, res) => {
  if (req.method === "POST" && (req.url ?? "").endsWith("/v1/messages")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let isReceipt = false;
      try {
        const parsed = JSON.parse(body);
        const props = parsed?.output_config?.format?.schema?.properties ?? {};
        isReceipt = "amountCents" in props;
      } catch {
        // fall through to brainstorm default
      }
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify(messageEnvelope(isReceipt ? RECEIPT : BRAINSTORM)));
    });
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(4788, "127.0.0.1", () => {
  console.log("mock anthropic listening on 4788");
});
