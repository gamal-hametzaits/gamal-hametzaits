# הגמל המצייץ 🐪

אתר האוהדים החי של הפועל באר שבע 🐪🔴 - בעברית (RTL): העברות, ניתוחים, טורי דעה, בלוגים ופס מבזקים מתעדכן, עם ממשק ניהול מלא לעורכים.

**האתר החי:** https://www.gamal-hametzaits.workers.dev

## ארכיטקטורה

- **Cloudflare Worker** (`worker.js`) - מגיש את האתר ומספק API:
  - `GET /api/list?col=articles|blogs|ticker` - קריאת תוכן (ציבורי)
  - `POST /api/admin` - כתיבה (מוגן בסיסמה): פעולות `check` / `create` / `update` / `remove`
- **Cloudflare Workers KV** - אחסון התוכן (עד 15 פריטים אחרונים לכל אוסף)
- **Frontend** (`public/index.html`) - אפליקציית עמוד יחיד, בעברית, RTL, ללא תלות ב-framework

## פריסה (Deploy)

דרישות: Node.js 20+ וחשבון Cloudflare (חינמי).

```bash
npm install          # מתקין wrangler
```

1. צרו API token ב-Cloudflare עם ההרשאה "Edit Cloudflare Workers".
2. צרו KV namespace והדביקו את ה-ID ב-`wrangler.toml`:

```bash
npx wrangler kv namespace create GAMAL_KV
```

3. הגדירו את סיסמת הניהול כ-secret (לעולם לא בתוך הקוד!):

```bash
export CLOUDFLARE_API_TOKEN=<the-token>
echo '<admin-password>' | npx wrangler secret put ADMIN_SECRET
```

4. פרסו:

```bash
npx wrangler deploy
```

## ניהול האתר

נכנסים ל-`#/admin` באתר, מזינים את סיסמת הניהול, ומשם אפשר לפרסם, לערוך ולמחוק כתבות, בלוגים ומבזקים. מבזק חדש מופיע אצל הקוראים תוך ~20 שניות.

## סודות - אף פעם לא ב-repo

- סיסמת הניהול חיה רק כ-`ADMIN_SECRET` (wrangler secret) - היא לא נמצאת בשום קובץ כאן.
- ה-API token של Cloudflare נשמר בכספת, לא בקוד.
- `wrangler.toml` מכיל רק שמות ו-IDs לא-סודיים.

## migrate.mjs

סקריפט חד-פעמי שהועתק את התוכן הראשוני מאחסון הזמני ל-KV של Cloudflare:

```bash
node migrate.mjs https://www.gamal-hametzaits.workers.dev <admin-secret>
```
