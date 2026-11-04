const TAGS = ["臨時", "計畫", "例行", "專案"];
const PRIORITIES = ["高", "中", "低"];
const STATUSES = ["未開始", "進行中", "已完成"];

const json = (data, status = 200) => Response.json(data, { status });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/tasks(?:\/(\d+))?$/);
    if (!m) return new Response("Not Found", { status: 404 });
    const id = m[1] ? Number(m[1]) : null;

    // 查詢 + 關鍵字搜尋（可輸入日期，如 20261104、2026-11-04、202611）
    if (request.method === "GET" && !id) {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 50);
      const order = `ORDER BY (status = '已完成'), urgent DESC,
        CASE priority WHEN '高' THEN 1 WHEN '中' THEN 2 ELSE 3 END,
        (due_date IS NULL), due_date, id DESC LIMIT 200`;
      let sql = "SELECT * FROM tasks";
      const binds = [];
      if (q) {
        const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
        const conds = ["title", "note", "tag", "status"].map((c) => {
          binds.push(like);
          return `${c} LIKE ? ESCAPE '\\'`;
        });
        const digits = q.replace(/[-\/.]/g, "");
        if (/^\d{4,8}$/.test(digits)) {
          conds.push("REPLACE(due_date, '-', '') LIKE ?");
          binds.push(`%${digits}%`);
        }
        sql += " WHERE " + conds.join(" OR ");
      }
      const { results } = await env.DB.prepare(`${sql} ${order}`).bind(...binds).all();
      return json(results);
    }

    // 新增
    if (request.method === "POST" && !id) {
      const b = await request.json().catch(() => ({}));
      const title = String(b.title || "").trim().slice(0, 200);
      const tag = TAGS.includes(b.tag) ? b.tag : null;
      const priority = PRIORITIES.includes(b.priority) ? b.priority : "中";
      const status = STATUSES.includes(b.status) ? b.status : "未開始";
      const due = /^\d{4}-\d{2}-\d{2}$/.test(b.due_date || "") ? b.due_date : null;
      const note = String(b.note || "").trim().slice(0, 500);
      if (!title || !tag) return json({ error: "請填寫標籤與工作事項" }, 400);

      await env.DB.prepare(
        `INSERT INTO tasks (tag, urgent, priority, title, due_date, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(tag, b.urgent ? 1 : 0, priority, title, due, status, note).run();
      return json({ ok: true }, 201);
    }

    // 更新完成情況
    if (request.method === "PATCH" && id) {
      const b = await request.json().catch(() => ({}));
      if (!STATUSES.includes(b.status)) return json({ error: "狀態不正確" }, 400);
      await env.DB.prepare("UPDATE tasks SET status = ? WHERE id = ?").bind(b.status, id).run();
      return json({ ok: true });
    }

    // 刪除
    if (request.method === "DELETE" && id) {
      await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
