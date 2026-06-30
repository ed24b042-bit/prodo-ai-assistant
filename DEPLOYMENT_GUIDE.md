# ProDo ⚡ — Deployment Guide

This guide details the steps required to deploy the **ProDo** backend (FastAPI + Docker on Render) and frontend (Next.js 14 on Vercel) to production.

---

## Deployment Architecture

```
                  ┌──────────────────────┐
                  │   Next.js Frontend   │ (Hosted on Vercel)
                  │  (React 18 + Client) │
                  └──────────┬───────────┘
                             │
                             │ HTTPS / SSE
                             ▼
                  ┌──────────────────────┐
                  │   FastAPI Backend    │ (Hosted on Render via Docker)
                  │ (LangGraph + Gemini) │
                  └──────────┬───────────┘
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
  ┌─────────────────────┐         ┌─────────────────────┐
  │   Google Calendar   │         │  Google Cloud / FB  │
  │     (OAuth Sync)    │         │ (Firestore & Auth)  │
  └─────────────────────┘         └─────────────────────┘
```

---

## Section 1: Deploying the Backend (Render)

Render supports direct deployment from `Dockerfile` or Render Blueprints (`render.yaml`).

### Option A: Using the Render Blueprint (Recommended)
1. Commit all your changes and push them to your GitHub repository.
2. Log in to [Render](https://dashboard.render.com).
3. Click **New** $\rightarrow$ **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect the `render.yaml` file in the root.
5. You will be prompted to enter the following environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Web Client ID.
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth 2.0 Web Client Secret.
   - `FIREBASE_PROJECT_ID`: Your Firebase Project ID.
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: The entire raw contents of your Firebase Service Account JSON file.
   - `FRONTEND_URL`: The URL of your deployed Vercel frontend (e.g., `https://prodo.vercel.app` — you can update this later if you haven't deployed the frontend yet).
6. Click **Apply**. Render will build and deploy the backend Docker container.

### Option B: Manual Web Service Setup
If you prefer to configure the Web Service manually:
1. Click **New** $\rightarrow$ **Web Service**.
2. Select your repository.
3. Configure the settings:
   - **Environment**: `Docker`
   - **Root Directory**: `backend`
   - **Plan**: `Free` or higher.
4. Add all environment variables listed above under **Environment** Settings.
5. Set the Start Command (Render handles this automatically from the Dockerfile, exposing port `8080`).

Once deployed, copy your Render web service URL (e.g., `https://prodo-backend.onrender.com`). This will be your `NEXT_PUBLIC_API_URL`.

---

## Section 2: Deploying the Frontend (Vercel)

Vercel is the native platform for Next.js, providing optimal edge caching and quick builds.

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** $\rightarrow$ **Project**.
3. Import your GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
5. Expand the **Environment Variables** section and add the following keys:
   - `NEXT_PUBLIC_API_URL`: The deployed Render backend service URL (e.g., `https://prodo-backend.onrender.com`).
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase web app config API Key.
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase web app config Auth Domain (e.g. `your-project.firebaseapp.com`).
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase Project ID.
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase App ID.
6. Click **Deploy**. Vercel will build and assign a public domain name to your frontend.

---

## Section 3: Updating Google Developer Console (GCP)

To allow production users to authenticate with Google Calendar:

1. Open the [Google Cloud Console](https://console.cloud.google.com).
2. Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
3. Select your active **OAuth 2.0 Client ID** (Web Client).
4. Update **Authorized JavaScript Origins**:
   - Add your localhost URL for development: `http://localhost:3000`
   - Add your production Vercel frontend URL: `https://your-app.vercel.app`
5. Update **Authorized Redirect URIs**:
   - Add your localhost redirect URL: `http://localhost:8000/auth/callback`
   - Add your deployed Render backend redirect URI: `https://prodo-backend.onrender.com/auth/callback`
6. Click **Save**. (Changes may take up to 5-10 minutes to propagate globally).

---

## Section 4: Updating Firebase Configuration

1. Open the [Firebase Console](https://console.firebase.google.com).
2. Select your project and navigate to **Authentication** $\rightarrow$ **Settings** $\rightarrow$ **Authorized domains**.
3. Click **Add domain** and register your deployed Vercel domain (e.g., `your-app.vercel.app`). This prevents CORS/origin errors during Firebase sign-in.
4. Verify that the **Firestore Security Rules** are configured to allow authenticated reads and writes:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## Verification & Health Check

You can verify that your production backend is running correctly by sending a request to the health endpoint in your browser:
`https://prodo-backend.onrender.com/health`

It should return a status confirmation:
```json
{
  "status": "ok",
  "time": "2026-06-30T15:00:00.000000"
}
```
Once this returns `ok` and GCP credentials update, you are ready to use the app in production.
