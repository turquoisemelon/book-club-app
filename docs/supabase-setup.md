# Switching on accounts (Supabase setup)

About 20 minutes, done once. Until this is finished the app keeps working exactly as before, saving everything on each device.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub sign-in is fine). The free plan is enough.
2. Click **New project**. Name it `chapterclub`, set a database password (save it in your password manager; you won't need it day to day), and pick the region closest to you and your members.
3. Wait a minute or two while it starts.

## 2. Create the database tables

Run each file in [`supabase/migrations`](../supabase/migrations) once, in number order:

1. In the left sidebar, open **SQL Editor**, then **New query**.
2. Paste the whole of the file and click **Run**. It should say "Success. No rows returned".
3. Repeat with a new query for the next file.

| File | What it adds |
| --- | --- |
| [`0001_profiles.sql`](../supabase/migrations/0001_profiles.sql) | Your name, for people who sign in |
| [`0002_clubs.sql`](../supabase/migrations/0002_clubs.sql) | Clubs, members and books, with the privacy rules |
| [`0003_invites.sql`](../supabase/migrations/0003_invites.sql) | Invite links: a secret code per club, and joining with it |
| [`0004_shelves.sql`](../supabase/migrations/0004_shelves.sql) | Your bookshelves (Goodreads imports), saved to your account |
| [`0005_fractional_ratings.sql`](../supabase/migrations/0005_fractional_ratings.sql) | Lets ratings like 2.25 be saved |
| [`0006_progress_percent.sql`](../supabase/migrations/0006_progress_percent.sql) | Reading progress in quarters of the book (25/50/75/100%) instead of chapters. Run after the app update that uses quarters is live. |
| [`0007_avatars.sql`](../supabase/migrations/0007_avatars.sql) | Profile pictures |

When a new file appears here in a later update, run just that one. Running a file twice does no harm.

## 3. Tell Supabase where the app lives

1. Open **Authentication → URL Configuration**.
2. **Site URL**: `https://chapterclub.app`
3. Under **Redirect URLs**, add:
   - `https://chapterclub.app/**`
   - `https://www.chapterclub.app/**` (if the www address also works)
   - `http://localhost:3000/**` (only needed for running it on a laptop)
4. Save.

## 4. Copy the two keys into Vercel

1. In Supabase, click **Connect** at the top of the project (or **Project Settings → API Keys**). Copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **publishable key** (starts with `sb_publishable_`; older projects call it the `anon` key)
2. In Vercel, open the book-club-app project → **Settings → Environment Variables** and add both, as type **Config** (not Secret), for Production, Preview and Development. Vercel warns that `NEXT_PUBLIC_` values are visible in the browser; that's expected for these two.
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key
3. **Redeploy**: Deployments → the latest one → ⋯ → Redeploy. The keys only take effect in a new build.

Never paste the **secret** key (`sb_secret_…`, or `service_role`) anywhere in the app or in chat.

## 5. Try it

1. Open https://chapterclub.app. The top right now says **Sign in**.
2. Enter your email and open the link it sends **on the same phone or browser**.
3. You land on **Your account**. Set your name.

Heads-up: Supabase's built-in email only sends a few sign-in emails per hour. That's fine for us testing. Before inviting a bigger group we'll connect a proper email sender (Resend).

## 6. Send sign-in emails through Resend (before inviting people)

Supabase's built-in email only sends about 2 emails an hour, which runs out after a few tries. Resend is free for up to 3,000 emails a month. Connecting it lifts the limit and makes the emails come from your own address. It takes about 15 minutes.

### 6a. Add your domain to Resend

1. Sign up at https://resend.com.
2. Open **Domains → Add domain**, enter `chapterclub.app`, pick the region closest to you, and click **Add**.
3. Resend lists a few DNS records (an MX and a couple of TXT records, one named `resend._domainkey`). Add them to Cloudflare:
   - **Easiest:** if Resend offers **Sign in to Cloudflare / Auto configure**, use it, and it adds the records for you.
   - **By hand:** in Cloudflare, open chapterclub.app → **DNS → Records → Add record**. Copy each record's **Type**, **Name** and **Value** (and **Priority** for the MX) exactly. These records don't affect the website.
4. Back in Resend, click **Verify DNS records**. It usually turns **Verified** within a few minutes, though it can take up to an hour.

### 6b. Make a sending key

1. In Resend, open **API Keys → Create API key**. Name it `supabase`, set permission to **Sending access**, and limit it to `chapterclub.app`.
2. Copy the key (it starts with `re_`). Resend shows it only once.
3. This one **is** a secret. Paste it only into Supabase in the next step. Don't paste it in chat, in Vercel, or in the code.

### 6c. Point Supabase at Resend

1. In Supabase, open **Authentication → Emails → SMTP Settings** (on some versions it's under **Project Settings → Authentication**) and switch on **Enable custom SMTP**.
2. Fill in:
   - **Sender email:** `hello@chapterclub.app` (any address at your domain works; it doesn't need a real inbox)
   - **Sender name:** `Chapter Club`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** the `re_…` key from 6b
3. Save.
4. Open **Authentication → Rate Limits** and set **emails sent per hour** to `30`. Supabase only lets you change this once custom SMTP is on.

### 6d. Try it

Request a sign-in link at https://chapterclub.app/sign-in. The email should come from Chapter Club <hello@chapterclub.app>. If it doesn't arrive in a minute, check spam, then **Emails → Logs** in Resend.

## 7. Make sign-in links work in any browser

By default, Supabase's sign-in link only works in the same browser that asked for it. If the email opens in a different browser (the Mail app opening Safari when you asked in Chrome, or tapping the link on your phone after asking on your laptop), it says the link expired. Changing the email to link straight to the app fixes that.

1. In Supabase, open **Authentication → Emails → Templates**.
2. Open the **Magic link** template:
   - **Subject:** `Your Chapter Club sign-in link`
   - **Body:** replace everything with the contents of [`supabase/templates/sign-in.html`](../supabase/templates/sign-in.html)
   - Save.
3. Do the same for the **Confirm sign up** template, which is what brand-new people get the first time. Use the same subject and body.
4. Request a new link and open it anywhere. You land on your account page, signed in, in whichever browser opened it.

Each link works once and expires after an hour.
