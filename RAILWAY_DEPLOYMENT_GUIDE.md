# Railway Hosting & Deployment Guide

This repository is configured for 1-click deployment on [Railway](https://railway.app) using a multi-stage Docker build that serves both the Vite React frontend and the Python Flask ML backend.

---

## 🚀 Quick Start Deployment (Railway Web Dashboard)

1. **Push your code to GitHub**
   Ensure all changes including `Dockerfile`, `railway.json`, and backend fixes are committed to your repository.

2. **Log in to Railway**
   Go to [railway.app](https://railway.app) and sign in with your GitHub account.

3. **Create a New Project**
   - Click **+ New Project**.
   - Select **Deploy from GitHub repo**.
   - Choose your repository (`3D_PRINTER_predictive_maintainance_`).

4. **Automatic Detection**
   - Railway will automatically detect the root `Dockerfile` and `railway.json`.
   - Railway automatically assigns a domain and injects a dynamic `$PORT` environment variable.

5. **Generate a Domain**
   - Click on your deployed service card in Railway.
   - Go to the **Settings** tab.
   - Scroll down to **Networking** -> **Public Networking**.
   - Click **Generate Domain** (e.g. `your-app.up.railway.app`).

6. **Verify your Deployment**
   - Open `https://your-app.up.railway.app/` to access the full-stack web dashboard.
   - Open `https://your-app.up.railway.app/api/ping` to test the API health status.

---

## 🛠️ Deployment via Railway CLI

If you prefer deploying via terminal:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link or create project
railway init

# Deploy to Railway
railway up
```

---

## 🐳 Testing Docker Locally

To test the production container locally before deploying:

Using Docker Compose:
```bash
docker-compose up --build
```
Or using plain Docker:
```bash
docker build -t 3d-printer-maint .
docker run -p 5000:5000 -e PORT=5000 3d-printer-maint
```

Then visit `http://localhost:5000` in your web browser.

---

## 🔍 Environment Variables (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Injected dynamically by Railway to specify HTTP listening port |
| `VITE_API_BASE_URL` | `/api` | Base URL for API calls. Defaults to `/api` on production build |
