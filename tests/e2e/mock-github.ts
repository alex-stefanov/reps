/**
 * Mock GitHub Events API for e2e runs. The app points at it via
 * GITHUB_API_URL; tests flip commit existence through POST /__set.
 * This exists so e2e can prove BOTH verification outcomes deterministically
 * — it never touches production code paths, which always hit github.com.
 */
import http from "node:http";

// handle → ISO push timestamp (null/absent = no commits)
const pushes = new Map<string, string>();

const server = http.createServer((req, res) => {
  const url = req.url ?? "";

  if (req.method === "POST" && url === "/__set") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { handle, pushedAt } = JSON.parse(body) as {
        handle: string;
        pushedAt: string | null;
      };
      if (pushedAt) pushes.set(handle, pushedAt);
      else pushes.delete(handle);
      res.writeHead(200).end("ok");
    });
    return;
  }

  const match = url.match(/^\/users\/([^/]+)\/events\/public/);
  if (req.method === "GET" && match) {
    const handle = decodeURIComponent(match[1]);
    const pushedAt = pushes.get(handle);
    const events = pushedAt
      ? [
          {
            type: "PushEvent",
            public: true,
            created_at: pushedAt,
            repo: { name: `${handle}/daily-grind` },
            payload: { commits: [{ sha: "e2e0c0ffee1234567890abcd" }] },
          },
        ]
      : [];
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify(events));
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(4799, "127.0.0.1", () => {
  console.log("mock github listening on 4799");
});
