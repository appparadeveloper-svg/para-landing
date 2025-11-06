# PARA Backend Render Deployment Guide

## 1. Prepare Your Code
- Ensure your backend code is in the `api/` folder.
- `server.js` is the entry point.
- `package.json` is present in `api/` (already configured).

## 2. Push to GitHub
- Commit and push the `api/` folder and its contents to your repository.

## 3. Deploy on Render
- Go to https://dashboard.render.com/
- Click "New +" → "Web Service"
- Connect your GitHub repo
- Set root directory to `api`
- Build command: `npm install`
- Start command: `npm start`
- Add environment variable `GEMINI_API_KEY` in the Render dashboard

## 4. Update Frontend
- Use your Render backend URL (e.g., `https://your-app.onrender.com/api/chat`) in your frontend code for API requests.

---

Your backend will now be publicly accessible and work with your Hostinger frontend.
