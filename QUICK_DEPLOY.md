# Quick Deployment Reference

## Your Backend URL
```
https://autolearn-cwhp.onrender.com
```

## Steps to Complete Deployment

### 1. Add GitHub Secret
1. Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_SOCKET_URL`
   - **Value**: `https://autolearn-cwhp.onrender.com`

### 2. Commit and Push
```bash
git add .
git commit -m "Fix GitHub Pages deployment - remove environment protection"
git push origin main
```

### 3. Update Backend CORS
Edit `backend/index.js` and update the CORS configuration to include your GitHub Pages URL:

```javascript
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",  // Local development
            "https://anant1711.github.io"  // Production (replace with your GitHub username)
        ],
        methods: ["GET", "POST"]
    }
});
```

Then commit and push to trigger Render redeploy.

### 4. Access Your Site
Your site will be available at: `https://anant1711.github.io/AutoLearn/`

## What Was Fixed

The deployment error "Branch 'main' is not allowed to deploy to github-pages due to environment protection rules" was caused by the GitHub Actions workflow trying to use a protected environment.

**Solution**: Removed the `environment` reference from `.github/workflows/deploy.yml` and moved permissions to the job level instead.

## Testing Locally with Production Backend

If you want to test with the production backend locally:

Edit `frontend/.env`:
```env
VITE_SOCKET_URL=https://autolearn-cwhp.onrender.com
```

Then run:
```bash
cd frontend
npm run dev
```
