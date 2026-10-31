export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/messages") {
      // 讀取最新 50 筆
      if (request.method === "GET") {
        const { results } = await env.DB
          .prepare("SELECT id, name, content, created_at FROM messages ORDER BY id DESC LIMIT 50")
          .all();
        return Response.json(results);
      }

      // 新增留言
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || "").trim().slice(0, 30);
        const content = String(body.content || "").trim().slice(0, 300);

        if (!name || !content) {
          return Response.json({ error: "請填寫名字與留言" }, { status: 400 });
        }

        await env.DB
          .prepare("INSERT INTO messages (name, content) VALUES (?, ?)")
          .bind(name, content)
          .run();

        return Response.json({ ok: true }, { status: 201 });
      }

      return new Response("Method Not Allowed", { status: 405 });
    }

    return new Response("Not Found", { status: 404 });
  },
};
