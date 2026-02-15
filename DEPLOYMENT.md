# ATLAS Platform — Production Deployment Guide

## Architecture

| Service | Provider | Tier |
|---------|----------|------|
| Frontend (Next.js) | Vercel | Free |
| Backend (NestJS) | Render | Free |
| Database (PostgreSQL) | Neon | Free |
| Keep-Alive Pinger | UptimeRobot | Free |

---

## Step 1: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project (e.g., `atlas-production`)
3. Choose the closest region to your users
4. Copy the **connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this — you'll need it as `DATABASE_URL` for Render

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `atlas-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Plan:** `Free`
5. Add **Environment Variables** (Settings → Environment):

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | *(your Neon connection string from Step 1)* |
   | `JWT_SECRET` | *(generate: `openssl rand -base64 32`)* |
   | `JWT_REFRESH_SECRET` | *(generate: `openssl rand -base64 32`)* |
   | `JWT_EXPIRATION` | `15m` |
   | `JWT_REFRESH_EXPIRATION` | `7d` |
   | `FRONTEND_URL` | *(your Vercel URL, set after Step 3)* |
   | `GEMINI_API_KEY` | *(your API key)* |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `EMAIL_HOST` | `smtp.gmail.com` |
   | `EMAIL_PORT` | `587` |
   | `EMAIL_USER` | *(your email)* |
   | `EMAIL_PASSWORD` | *(your app-specific password)* |
   | `EMAIL_FROM` | `ATLAS Platform <noreply@atlas.com>` |

6. Click **Create Web Service** and wait for the first deploy
7. Your backend URL will be: `https://atlas-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend`
5. Add **Environment Variable:**

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://atlas-backend.onrender.com/api/v1` |

6. Click **Deploy**
7. Your frontend URL will be something like: `https://atlas-platform.vercel.app`

---

## Step 4: Update Render with Frontend URL

1. Go back to Render dashboard → your backend service → Environment
2. Set `FRONTEND_URL` to your Vercel URL (e.g., `https://atlas-platform.vercel.app`)
3. Render will auto-redeploy

---

## Step 5: Set Up UptimeRobot (Keep Backend Awake)

Render free tier sleeps after 15 minutes of inactivity. A free pinger prevents this.

1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up
2. Click **Add New Monitor**
3. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `ATLAS Backend`
   - **URL:** `https://atlas-backend.onrender.com/api/v1`
   - **Monitoring Interval:** `5 minutes`
4. Save — it will ping your backend every 5 minutes to prevent sleeping

---

## Step 6: Run Database Migration

After the first Render deploy, the Dockerfile automatically runs `prisma migrate deploy`.
If you need to run it manually:

1. Go to Render dashboard → your service → **Shell**
2. Run: `npx prisma migrate deploy`

---

## Step 7: Create Admin Account

1. Open your frontend URL
2. Navigate to `/setup` to create the first admin account
3. This endpoint is rate-limited to 3 requests per minute

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify `DATABASE_URL` is correct and has `?sslmode=require` at the end
- Ensure `JWT_SECRET` is set (backend throws on startup if missing)

### WebSocket connections dropping
- This is normal on Render free tier if UptimeRobot stops
- Frontend hooks have auto-reconnect logic built in
- Ensure `FRONTEND_URL` is set correctly for CORS

### Database connection refused
- Neon free tier pauses after 5 min inactivity (auto-resumes on connection)
- First request after pause may be slow (~1-2 sec)

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` in Vercel matches your Render URL
- Must include `/api/v1` at the end
- Check browser console for CORS errors
