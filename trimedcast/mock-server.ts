// Mock TrimedCast API server for browser verification
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health endpoint
    if (path === "/api/v1/health") {
      const allHealthy = true;
      const components = {
        database: { status: "healthy", driver: "pgsql" },
        cache: { status: "healthy", driver: "redis" },
        queue: { status: "healthy", driver: "redis" },
      };

      return new Response(
        JSON.stringify({
          status: allHealthy ? "healthy" : "degraded",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          components,
        }),
        {
          status: allHealthy ? 200 : 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Laravel built-in health
    if (path === "/up") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Root
    if (path === "/") {
      return new Response("<h1>TrimedCast</h1>", {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Mock TrimedCast server running at http://localhost:${server.port}`);
