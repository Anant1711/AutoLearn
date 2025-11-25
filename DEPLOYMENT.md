# AutoLearn Deployment Guide

This guide explains how to deploy the AutoLearn application with the frontend on GitHub Pages and the backend on a separate hosting service.

## Architecture Overview

AutoLearn consists of two parts:

- **Frontend**: React + Vite application (static files) → Deployed to **GitHub Pages**
- **Backend**: Node.js + Socket.IO server (real-time server) → Deployed to **Render** (or similar service)

> **Why separate deployments?** GitHub Pages only hosts static files (HTML, CSS, JavaScript). The backend requires a Node.js runtime to handle WebSocket connections and real-time CAN message simulation.

---

## Part 1: Deploy Backend to Render

### Step 1: Create a Render Account

1. Go to [render.com](https://render.com) and sign up (free tier available)
2. Connect your GitHub account

### Step 2: Create a New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `AutoLearn` repository
3. Configure the service:
   - **Name**: `autolearn-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`

### Step 3: Add Environment Variables (Optional)

If you need any environment variables for the backend, add them in the "Environment" section:
- `PORT` is automatically set by Render, no need to add it

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy your backend
3. Once deployed, you'll get a URL like: `https://autolearn-backend.onrender.com`
4. **Save this URL** - you'll need it for the frontend configuration

> **Note**: Free tier services on Render spin down after 15 minutes of inactivity. The first request after inactivity may take 30-60 seconds to wake up.

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"

### Step 2: Configure Backend URL

You need to tell the frontend where your backend is hosted.

**Option A: Using GitHub Secrets (Recommended for Production)**

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_SOCKET_URL`
   - **Value**: Your Render backend URL (e.g., `https://autolearn-backend.onrender.com`)

**Option B: Hardcode in .env (For Testing)**

Edit `frontend/.env`:
```env
VITE_SOCKET_URL=https://autolearn-backend.onrender.com
```

> **Warning**: If you hardcode the URL, make sure `.env` is in `.gitignore` (already done).

### Step 3: Deploy

1. Commit and push your changes to the `main` branch:
   ```bash
   git add .
   git commit -m "Configure for GitHub Pages deployment"
   git push origin main
   ```

2. The GitHub Action will automatically:
   - Build the frontend
   - Deploy to GitHub Pages

3. Your site will be available at: `https://[your-username].github.io/AutoLearn/`

---

## Part 3: Update Backend CORS Settings

Once you know your GitHub Pages URL, update the backend to allow connections from it.

Edit `backend/index.js` and update the CORS configuration:

```javascript
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",  // Local development
            "https://[your-username].github.io"  // Production
        ],
        methods: ["GET", "POST"]
    }
});
```

Commit and push this change. Render will automatically redeploy the backend.

---

## How It Works

### Architecture Flow

```
User Browser
    ↓
GitHub Pages (Frontend)
    ↓ WebSocket Connection
Render (Backend Server)
    ↓ Simulates CAN Messages
User Browser (Real-time Updates)
```

1. **User visits GitHub Pages**: The static frontend (HTML, CSS, JS) is served from GitHub Pages
2. **Frontend connects to backend**: The React app establishes a WebSocket connection to your Render backend using the `VITE_SOCKET_URL`
3. **Real-time communication**: The backend simulates vehicle CAN messages and sends them to the frontend via Socket.IO
4. **User interactions**: When users press accelerate/brake, the frontend sends control messages to the backend

---

## Local Development

To run locally:

1. **Start the backend**:
   ```bash
   cd backend
   npm install
   node index.js
   ```
   Backend runs on `http://localhost:3000`

2. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

The frontend will automatically connect to `http://localhost:3000` (configured in `frontend/.env`).

---

## Alternative Backend Hosting Options

If you prefer not to use Render, here are alternatives:

### Railway
- Free tier available
- Similar to Render
- Deploy: [railway.app](https://railway.app)

### Vercel (Serverless)
- Free tier available
- Requires converting to serverless functions
- May need to use a different WebSocket approach

### Heroku
- No free tier (starts at $5/month)
- Very reliable
- Deploy: [heroku.com](https://heroku.com)

### Self-hosted (VPS)
- DigitalOcean, AWS EC2, Google Cloud, etc.
- More control but requires server management
- Costs vary

---

## Troubleshooting

### Frontend can't connect to backend

1. Check the browser console for errors
2. Verify `VITE_SOCKET_URL` is set correctly
3. Ensure backend CORS allows your GitHub Pages domain
4. Check if Render backend is awake (free tier spins down)

### GitHub Actions deployment fails

1. Check the Actions tab in your GitHub repository
2. Verify `VITE_SOCKET_URL` secret is set correctly
3. Ensure all dependencies are in `package.json`

### Backend not responding

1. Check Render logs for errors
2. Verify the backend is running (check Render dashboard)
3. Free tier may be sleeping - make a request to wake it up

### CORS errors

Make sure the backend `cors.origin` includes your GitHub Pages URL without trailing slash.

---

## Monitoring

- **Frontend**: Check GitHub Actions for deployment status
- **Backend**: Use Render dashboard to view logs and metrics
- **Uptime**: Consider using a service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 5 minutes to keep it awake (free tier)

---

## Cost Summary

- **GitHub Pages**: Free
- **Render Free Tier**: Free (with limitations: spins down after 15 min inactivity, 750 hours/month)
- **Total**: $0/month for basic usage

For production use with guaranteed uptime, consider upgrading Render to a paid plan (~$7/month).
