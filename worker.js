/* הגמל המצייץ - Cloudflare Worker backend
   KV layout: reg_<col> = JSON array of ids (newest first, cap 15), item_<id> = full item JSON */
const COLS = ["articles", "blogs", "ticker"];

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
async function regIds(env, col) { const s = await env.GAMAL_KV.get("reg_" + col); return s ? JSON.parse(s) : []; }
async function setReg(env, col, ids) { await env.GAMAL_KV.put("reg_" + col, JSON.stringify(ids.slice(0, 15))); }
async function readCol(env, col) {
  const ids = await regIds(env, col);
  const items = await Promise.all(ids.map(async (id) => {
    const s = await env.GAMAL_KV.get("item_" + id);
    if (!s) return null;
    const o = JSON.parse(s); o._id = id; return o;
  }));
  return items.filter(Boolean);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return json({ ok: true });

    if (url.pathname === "/api/list" && request.method === "GET") {
      const col = url.searchParams.get("col");
      if (!COLS.includes(col)) return json({ error: "bad col" }, 400);
      return json(await readCol(env, col));
    }

    if (url.pathname === "/api/admin") {
      if (request.method !== "POST") return json({ error: "method" }, 405);
      const b = await request.json().catch(() => null);
      if (!b || !env.ADMIN_SECRET || b.password !== env.ADMIN_SECRET) return json({ error: "unauthorized" }, 401);
      if (b.action === "check") return json({ ok: true });
      const { action, col, id, payload } = b;
      if (!COLS.includes(col)) return json({ error: "bad col" }, 400);

      if (action === "create") {
        const nid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        await env.GAMAL_KV.put("item_" + nid, JSON.stringify(payload || {}));
        const ids = await regIds(env, col); ids.unshift(nid);
        await setReg(env, col, ids);
        return json({ ok: true, id: nid });
      }
      if (action === "update") {
        if (!id) return json({ error: "no id" }, 400);
        await env.GAMAL_KV.put("item_" + id, JSON.stringify(payload || {}));
        return json({ ok: true });
      }
      if (action === "remove") {
        if (!id) return json({ error: "no id" }, 400);
        const ids = (await regIds(env, col)).filter((x) => x !== id);
        await setReg(env, col, ids);
        await env.GAMAL_KV.delete("item_" + id);
        return json({ ok: true });
      }
      return json({ error: "bad action" }, 400);
    }

    return env.ASSETS.fetch(request);
  },
};
