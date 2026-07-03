# Deploying BuildVerse to Vercel

This project uses TanStack Start + Nitro. The `vercel` preset is already
configured in `vite.config.ts`, and `vercel.json` tells Vercel where to
find the Build Output.

## 1. Push the repo to GitHub / GitLab / Bitbucket

Vercel deploys from a Git provider. Push this project to a remote repo.

## 2. Import into Vercel

1. Go to <https://vercel.com/new> and select your repo.
2. When Vercel asks for a **Framework Preset**, choose **Other**
   (the `vercel.json` in this repo already sets:
   `buildCommand = bun run build`,
   `installCommand = bun install`,
   `outputDirectory = .output`).
3. Do **not** override the build settings.

## 3. Environment variables

Add these to **Project → Settings → Environment Variables** (Production
and Preview). Values come from your Lovable Cloud backend and MSG91
account:

**Public (safe to expose)**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Server-only (secrets)**
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` — same value as `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — from your backend (keep private)
- `PHONE_AUTH_PEPPER` — copy the exact value from Lovable → Cloud → Secrets
  (changing this value logs out every user, so keep it stable)
- `LOVABLE_API_KEY` — if you use Lovable AI features
- `MSG91_AUTH_KEY` — from <https://control.msg91.com/app/user/settings/authkey>
- `MSG91_OTP_TEMPLATE_ID` — id of your approved DLT OTP template
- `MSG91_SENDER_ID` — 6-char DLT sender id (e.g. `BLDVRS`)

You can copy the current values from Lovable → Cloud → Secrets in your
project dashboard.

## 4. Deploy

Click **Deploy**. Vercel will run `bun install`, then `bun run build`
(which triggers Nitro's Vercel preset), and serve from `.output/`.

## 5. Custom domain (optional)

Add your domain under **Project → Settings → Domains**. Vercel manages
SSL automatically.

## Troubleshooting

- **OTP not delivered** — MSG91 keys not set, or template not approved.
  Check server logs; the code logs `[phone-auth] MSG91 not configured`
  when keys are missing and prints the OTP for local development.
- **`Sign-in failed`** — verify `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` are present in Vercel env (server-only
  copies are required in addition to the `VITE_` browser copies).
- **All users logged out after deploy** — you changed
  `PHONE_AUTH_PEPPER`. Set it back to the previous value.
