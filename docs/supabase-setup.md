# Switching on accounts (Supabase setup)

About 20 minutes, done once. Until this is finished the app keeps working exactly as before, saving everything on each device.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub sign-in is fine). The free plan is enough.
2. Click **New project**. Name it `chapterclub`, set a database password (save it in your password manager; you won't need it day to day), and pick the region closest to you and your members.
3. Wait a minute or two while it starts.

## 2. Create the profiles table

1. In the left sidebar, open **SQL Editor**, then **New query**.
2. Paste the whole of [`supabase/migrations/0001_profiles.sql`](../supabase/migrations/0001_profiles.sql) and click **Run**. It should say "Success. No rows returned".

## 3. Tell Supabase where the app lives

1. Open **Authentication → URL Configuration**.
2. **Site URL**: `https://chapterclub.app`
3. Under **Redirect URLs**, add:
   - `https://chapterclub.app/**`
   - `http://localhost:3000/**` (only needed for running it on a laptop)
4. Save.

## 4. Copy the two keys into Vercel

1. In Supabase, click **Connect** at the top of the project (or **Project Settings → API Keys**). Copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **publishable key** (starts with `sb_publishable_`; older projects call it the `anon` key)
2. In Vercel, open the book-club-app project → **Settings → Environment Variables** and add both, for all environments:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key
3. **Redeploy**: Deployments → the latest one → ⋯ → Redeploy. The keys only take effect in a new build.

Never paste the **secret** key (`sb_secret_…`, or `service_role`) anywhere in the app or in chat.

## 5. Try it

1. Open https://chapterclub.app. The top right now says **Sign in**.
2. Enter your email and open the link it sends **on the same phone or browser**.
3. You land on **Your account**. Set your name.

Heads-up: Supabase's built-in email only sends a few sign-in emails per hour. That's fine for us testing. Before inviting a bigger group we'll connect a proper email sender (Resend).
