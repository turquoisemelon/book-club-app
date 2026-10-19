# Book Club

A mobile-web app for running small book clubs, with an AI co-host that drafts the busywork for the host to approve.

This is the **clickable prototype**: every screen of the host flow works, using sample data saved in the browser's localStorage. There is no backend yet, and the co-host writes its drafts from templates instead of calling Claude.

## What you can try

- Start a club and share a one-tap invite link (`/join/<club>`)
- Vote in a book poll, add books from a live Open Library search, close the poll
- Mark reading progress and watch spoiler-gated discussion topics unlock
- Schedule meetups, RSVP, add to calendar
- Co-host inbox: discussion questions, reminders, next-book shortlist, recaps; approve, edit or discard
- Directory of local clubs that are open to new members
- Goodreads CSV import (parsed in the browser)

"Prototype controls" on the home screen switch between host and member view and reset the sample data.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 (narrow the window or use your browser's phone view).

## Stack

Next.js (App Router) + TypeScript + Tailwind. See the tech stack doc for where this is going: Supabase for data and auth, Claude for the co-host, Vercel for hosting.
