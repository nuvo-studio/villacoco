## Cloudflare Pages Backend Setup

This project uses a Cloudflare Pages Function at `functions/api/cms.js`.

### 1) Deploy with Functions enabled

- Use **Cloudflare Pages + Git integration** (recommended), or
- Deploy with Wrangler from this project root.

If you upload only static files, Functions will not run and `/api/cms` will return HTML instead of JSON.

### 2) Add required bindings in Cloudflare Pages

In your Pages project settings, add:

- **KV Namespace binding**
  - Variable name: `VILLA_COCO_CMS`
  - Value: your KV namespace
- **Environment variable**
  - Variable name: `ADMIN_PASSWORD`
  - Value: your admin password

Optional:

- `ALLOWED_ORIGINS` (comma-separated origins)

### 3) Verify the backend is live

After deploy, open:

- `/api/cms?action=health` -> should return JSON like `{ "ok": true, ... }`

Then:

- `/api/cms` -> should return `{}` (or saved data JSON)

### 4) Login behavior

Admin tries these endpoints automatically:

- `/api/cms`
- `/functions/api/cms`
- `/.netlify/functions/cms`

On Cloudflare, the correct one should be `/api/cms`.
