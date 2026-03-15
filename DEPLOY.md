# Deploy ChatConnect to Render

## Prerequisites

- [Supabase](https://supabase.com) project with PostgreSQL
- [Render](https://render.com) account
- GitHub repo with your code pushed

## Troubleshooting

### No auto-deploy on push
1. Render Dashboard → your service → **Settings** → **Build & Deploy**
2. Set **Auto-Deploy** to **Yes**
3. Ensure **Branch** is `main` (or your deploy branch)
4. If using Blueprint: **Dashboard** → **Blueprints** → your blueprint → **Sync** to apply render.yaml changes

### Deploy shows old content (no call history, old theme)
1. **Clear build cache**: Render Dashboard → your service → **Manual Deploy** → **Clear build cache & deploy**
2. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check build logs for errors (db push or frontend build failing)

### Database connection fails during build
For Supabase, add `sslmode=no-verify` to your connection string:
`postgresql://...?sslmode=no-verify` (or change `sslmode=require` to `sslmode=no-verify`)

## Steps

### 1. Connect your GitHub repo

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub account and select the `C2_supabase` (or your) repository
4. Render will detect `render.yaml` and use it

### 2. Configure environment variables

In the Render service settings, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string, e.g. `postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:6543/postgres?sslmode=require` |
| `SESSION_SECRET` | A random string. Generate with: `openssl rand -hex 32` |

`NODE_ENV=production` is set automatically in the blueprint.

### 3. Deploy

- **Build Command** (from render.yaml): `corepack enable pnpm && pnpm install --ignore-scripts && pnpm --filter @workspace/api-server run build`
- **Start Command**: `node artifacts/api-server/dist/index.cjs`
- **PORT**: Set automatically by Render

Click **Create Web Service** or **Deploy** to start.

### 4. (Optional) Manual setup without Blueprint

If you prefer to create the service manually instead of using render.yaml:

1. **New** → **Web Service**
2. Connect your repo
3. **Root Directory**: leave blank (use repo root)
4. **Runtime**: Node
5. **Build Command**: `corepack enable pnpm && pnpm install --ignore-scripts && pnpm --filter @workspace/api-server run build`
6. **Start Command**: `node artifacts/api-server/dist/index.cjs`
7. Add `DATABASE_URL` and `SESSION_SECRET` as environment variables

## Supabase connection string

From your Supabase project:

1. **Project Settings** → **Database**
2. Copy the **Connection string** (URI, Transaction pooler on port 6543)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Add `?sslmode=require` at the end

Example: `postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres?sslmode=require`
