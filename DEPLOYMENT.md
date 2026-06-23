# Deployment Guide

This document outlines everything needed to run, build, and deploy the TuneHina Progressive Web App (PWA) to Cloudflare Pages.

## 1. Local Development

To run the application locally in development mode with Hot Module Replacement (HMR):

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

## 2. Production Build

To compile the application for production, run:

```bash
# Verify TypeScript and build the optimized bundle
npm run build
```

This command will:
1. Run `tsc` to verify TypeScript typings.
2. Run `vite build` to bundle and minify the React application into the `dist/` directory.
3. Generate the PWA Service Worker (`sw.js`) and Web Manifest (`manifest.webmanifest`).

To preview the production build locally before deploying:
```bash
npm run preview
```

## 3. Cloudflare Pages Deployment

TuneHina is fully optimized for **Cloudflare Pages**, a fast, secure, and free hosting platform for static assets and Jamstack apps.

### Option A: Deployment via GitHub Integration (Recommended)
1. Push this codebase to a GitHub repository.
2. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set the **Build settings**:
   * **Framework preset**: `Vite` (or `None`)
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare will now automatically build and deploy whenever you push to your main branch.

### Option B: Direct CLI Deployment (Wrangler)
If you prefer to deploy directly from your terminal using Cloudflare's Wrangler CLI:

```bash
# 1. Install Wrangler globally (if not already installed)
npm install -g wrangler

# 2. Authenticate Wrangler with your Cloudflare account
wrangler login

# 3. Build the project locally
npm run build

# 4. Deploy the 'dist' directory to Cloudflare Pages
wrangler pages deploy dist --project-name="tunehina"
```

## 4. Environment Variables

TuneHina V1 is completely statically built and currently does **not** require any `.env` files for the core functionality. All API endpoints are abstracted into `src/config/constants.ts` because the underlying APIs are public and do not require secret API keys to be passed from the client.

## 5. Troubleshooting

### Q: Changes to the UI aren't showing up on mobile after deploying.
**A:** Because TuneHina is a PWA with aggressive caching, old assets may be cached. The Service Worker is set to `autoUpdate`, meaning it will install the new version in the background. Simply close the app and reopen it, or clear your browser cache.

### Q: The build fails with `tsc` errors.
**A:** This means there are TypeScript type mismatches. Ensure you are running `npm run build` which safely catches these. You can bypass TS checking by running `vite build` directly, but it is highly discouraged.
