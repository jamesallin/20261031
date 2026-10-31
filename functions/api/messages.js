// GET /api/messages  → 讀取最新 50 筆
export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT id, name, content, created_at FROM messages ORDER BY id DESC LIMIT 50")
    .all();
  return Response.json(results);
}

// POST /api/messages → 新增留言
export async function onRequestPost({ request, env }) {
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
