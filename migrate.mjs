/* Migrate seeded content from keyvalue.immanuel.co to the Cloudflare worker via /api/admin */
const BASE = "https://keyvalue.immanuel.co/api/KeyVal/", APP = "gamal-hametzaits-77x9";
const WORKER = process.argv[2], PASS = process.argv[3];
if (!WORKER || !PASS) { console.error("usage: node migrate.mjs <worker-url> <admin-secret>"); process.exit(1); }
const dec = (s) => { s = String(s || "").replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; if (!s) return ""; return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))); };
async function getKey(k) { const r = await fetch(BASE + "GetValue/" + APP + "/" + k); if (!r.ok) throw new Error("get " + k); return dec(await r.json()); }
async function readCol(col) {
  const s = await getKey("reg_" + col); if (!s) return [];
  const ids = s.split(",").filter(Boolean);
  const out = [];
  for (const id of ids) {
    try {
      const m = JSON.parse(await getKey("m_" + id));
      const hParts = []; for (let i = 0; i < m.nh; i++) hParts.push(await getKey("h_" + id + "_" + i));
      const hd = JSON.parse(hParts.join(""));
      let body = ""; for (let i = 0; i < m.nc; i++) body += await getKey("c_" + id + "_" + i).catch(() => "");
      out.push({ title: hd.t || "", category: hd.c || "", author: hd.a || "", summary: hd.s || "", text: hd.s || "", body, featured: !!m.f, ts: m.ts });
    } catch (e) { console.error("skip", id, e.message); }
  }
  return out;
}
async function push(col, payload) {
  const r = await fetch(WORKER + "/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: PASS, action: "create", col, payload }) });
  if (!r.ok) throw new Error("push " + col + " -> " + r.status + " " + (await r.text()));
}
for (const col of ["articles", "blogs", "ticker"]) {
  const items = (await readCol(col)).sort((a, b) => a.ts - b.ts); // oldest first; worker unshifts
  for (const it of items) { await push(col, it); process.stdout.write(col[0]); }
  console.log(" " + col + ": " + items.length + " migrated");
}
console.log("migration done");
