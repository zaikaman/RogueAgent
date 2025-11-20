**Overview**
- **Purpose:** Deploy the `frontend` to Vercel and the `backend` to Heroku (persistent dyno).
- **Repo layout:** frontend is in `frontend/`; backend is in `backend/` and already contains a `Procfile`.

**Frontend (Vercel)**
- **Project root:** `frontend`
- **Build command:** `npm run build` (already in `frontend/package.json`)
- **Output directory:** `dist` (Vite default)
- **Env vars:** public client vars should be prefixed with `VITE_` and set in Vercel dashboard or via CLI.

Steps (quick, using Vercel CLI):

1. Install and login to Vercel (PowerShell):

```powershell
npm i -g vercel
vercel login
```

2. From repository root or the `frontend` folder, deploy:

```powershell
cd frontend
vercel --prod
```

Follow prompts to create/select a project. If Vercel asks for root, point it to the current folder (`.`).

3. Configure environment variables in the Vercel dashboard (Project → Settings → Environment Variables) or use the CLI:

```powershell
vercel env add VITE_API_URL production
```

Notes:
- You can add an explicit `vercel.json` inside `frontend/` if you want to pin build settings, but it's not required.

**Backend (Heroku) — using subdir buildpack**
- **Why subdir buildpack:** The repo is a monorepo; the backend lives in `backend/`. Use a subdir buildpack so Heroku runs its buildpacks in that subfolder.
- **Procfile:** `backend/Procfile` already contains `web: npm start` which Heroku will use to run the web dyno.
- **Build:** `backend/package.json` has `build` and `start` scripts. The TypeScript build produces output under `dist` and `start` uses the compiled JS.

High-level steps:

1. Install the Heroku CLI and login (PowerShell):

```powershell
choco install heroku-cli -y
heroku login
```

If you don't use Chocolatey, download the installer from https://devcenter.heroku.com/articles/heroku-cli

2. Create a Heroku app and configure buildpacks for the subdirectory. Replace `<APP_NAME>` with your desired app name (or omit `-a` to let Heroku generate one).

```powershell
# Create the app
heroku create <APP_NAME>

# Set the subdir buildpack first (it adjusts the build dir to the subfolder)
heroku buildpacks:set https://github.com/timanovsky/subdir-heroku-buildpack.git -a <APP_NAME>

# Add the Node.js buildpack so Heroku will install deps and run build/start (ensure this is AFTER the subdir buildpack)
heroku buildpacks:add heroku/nodejs -a <APP_NAME>

# Tell the subdir buildpack which subdirectory to use
heroku config:set PROJECT_PATH=backend -a <APP_NAME>
```

Notes about the buildpack order: the subdir buildpack should run before the language buildpack so it changes into the `backend` folder for the subsequent Node build.

3. Add Heroku remote (if not already added) and push your repo to deploy:

```powershell
# If the app was created by you locally, Heroku CLI already added a git remote named 'heroku'. If not:
heroku git:remote -a <APP_NAME>

# Push your main branch to Heroku
git push heroku main
```

4. Environment variables / secrets

Set required environment variables (use values from your `.env` or environment provider). Example:

```powershell
heroku config:set SUPABASE_URL="https://..." SUPABASE_SERVICE_KEY="..." TELEGRAM_BOT_TOKEN="..." -a <APP_NAME>
```

Important env notes:
- Do not set `PORT` manually — Heroku provides it automatically.
- `NODE_ENV` should be `production` in Heroku (Heroku sets `NODE_ENV=production` by default when building).

5. Verify the dyno and logs

```powershell
heroku ps:scale web=1 -a <APP_NAME>
heroku logs --tail -a <APP_NAME>
```

**Optional: Deploy from GitHub**
- You can connect your GitHub repo in the Heroku dashboard (Deploy → Deployment method → GitHub) and enable automatic deploys from `main`.

**Considerations & troubleshooting**
- Build failures: check `heroku logs --tail` and the build output in the Dashboard (Activity → View build log).
- TypeScript compilation: the backend's `build` script runs `tsc`. The Node buildpack will run `npm install` and then `npm run build` if `heroku-postbuild` or `build` is present. If Heroku doesn't run `npm run build` automatically, you can add a `heroku-postbuild` script in `backend/package.json`:

```json
"scripts": {
  "heroku-postbuild": "npm run build"
}
```

- If you need the backend to run scheduled jobs at particular intervals you can:
  - Keep the current `setInterval` behavior — it will run on the dyno while the web process is alive.
  - Use the Heroku Scheduler add-on to trigger endpoints or run a custom worker dyno if you want separate scheduling.

**Summary / Quick checklist**
- **Frontend:** Deploy `frontend/` to Vercel (build: `npm run build`, outDir: `dist`).
- **Backend:** Create Heroku app, set subdir buildpack and Node buildpack, set `PROJECT_PATH=backend`, set environment variables, push to Heroku or connect GitHub.

If you want, I can:
- Add a `heroku-postbuild` script to `backend/package.json` so Heroku always runs the TypeScript build during deployment.
- Create a short `vercel.json` in `frontend/` to pin the build/output settings.

Tell me which of those you'd like me to implement and I'll apply the changes.
