import Link from "next/link";
import { APP_NAME, DrawnCover, Logo } from "./brand";
import { ButtonLink, SparkleIcon } from "./ui";

// What a signed-out visitor sees at the home page.
export function Landing() {
  return (
    <main className="overflow-hidden pb-10">
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <Logo />
        <ButtonLink href="/sign-in" variant="secondary" size="sm">
          Sign in
        </ButtonLink>
      </header>

      <section className="px-5 pt-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          For book clubs that actually meet
        </p>
        <h1 className="mt-4 font-serif text-[38px] font-semibold leading-[1.05] tracking-tight">
          Your club, <span className="italic text-accent">minus the admin.</span>
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Pick the next book, set the date and keep the talk spoiler-free, all in one place. Your AI co-host drafts the reminders, and nothing goes out until you approve it.
        </p>
        <div className="mt-6 space-y-3">
          <ButtonLink href="/sign-in" className="w-full">
            Start your club
          </ButtonLink>
          <p className="text-center text-xs text-muted">No app to download. Works on any phone.</p>
        </div>
      </section>

      <HeroPreview />

      <section className="px-5 pt-14">
        <h2 className="font-serif text-2xl font-semibold leading-tight">From group chat chaos to a club that runs itself</h2>
        <ol className="mt-6 space-y-5">
          {[
            ["Start a club, send one link", "Friends tap it and they're in. No passwords, nothing to install."],
            ["Vote on the book, pick the date", "Polls settle the next read. Meetups get RSVPs and a calendar invite."],
            ["Let your co-host do the busywork", "Reminders, discussion questions and recaps are drafted for you to check."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 font-serif text-sm font-semibold text-accent">{i + 1}</span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 pt-12">
        <div className="grid grid-cols-2 gap-3">
          <Feature icon={<LockIcon />} title="Spoiler-safe talk">
            Threads open chapter by chapter, so nobody ruins the ending.
          </Feature>
          <Feature icon={<PollIcon />} title="Book polls">
            Shortlist a few, everyone votes, done.
          </Feature>
          <Feature icon={<CalendarIcon />} title="Meetups">
            In person or on video, with RSVPs.
          </Feature>
          <Feature icon={<ShelfIcon />} title="Your Goodreads shelf">
            Bring it along to find the next pick.
          </Feature>
        </div>
      </section>

      <section className="mx-5 mt-12 rounded-3xl bg-ai-soft px-5 py-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ai">
          <SparkleIcon size={12} /> Your co-host
        </p>
        <p className="mt-2 font-serif text-xl font-semibold leading-snug">A helper, not a robot in charge.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">
          It writes the first draft of the dull parts. You read it, change what you like, and only then does your club see it. The conversation stays between people.
        </p>
      </section>

      <section className="mx-5 mt-12 rounded-3xl bg-accent px-5 py-8 text-center text-white">
        <p className="font-serif text-2xl font-semibold leading-tight">Your next meeting could be the easiest one yet.</p>
        <ButtonLink href="/sign-in" variant="secondary" className="mt-6 w-full border-0">
          Start your club
        </ButtonLink>
        <p className="mt-4 text-sm text-white/75">
          Got an invite link? Just open it and you&apos;ll go straight to your club.
        </p>
      </section>

      <footer className="mt-10 px-5 text-center text-xs text-muted">
        <p>
          {APP_NAME} · Made for readers ·{" "}
          <Link href="/sign-in" className="font-medium text-accent">
            Sign in
          </Link>
        </p>
      </footer>
    </main>
  );
}

// A drawn glimpse of the app: fanned covers, a club card and a co-host draft.
function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-5 mt-10 h-[340px] select-none">
      <div className="absolute inset-x-0 bottom-0 top-10 rounded-3xl bg-[#efe6d6]" />
      <DrawnCover title="Piranesi" author="Susanna Clarke" color="#5b6abf" width={88} className="absolute left-[12%] top-4 -rotate-[9deg]" />
      <DrawnCover title="Remarkably Bright Creatures" author="Shelby Van Pelt" color="#a23b72" width={88} className="absolute right-[12%] top-4 rotate-[9deg]" />
      <DrawnCover title="Intermezzo" author="Sally Rooney" color="#2d7d9a" width={96} className="absolute left-1/2 top-0 z-10 -translate-x-1/2" />

      <div className="absolute inset-x-4 top-[132px] z-20 rounded-2xl border border-line bg-card p-3.5 shadow-[0_12px_30px_-12px_rgba(31,42,36,0.35)]">
        <div className="flex items-center justify-between">
          <p className="font-serif text-[17px] font-semibold">Sunday Pages</p>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Thu, 7 pm</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">Reading Intermezzo · 6 of 8 coming</p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper">
          <div className="h-full w-[62%] rounded-full bg-accent" />
        </div>
      </div>

      <div className="absolute inset-x-9 top-[226px] z-30 rounded-2xl border border-[#efd9b6] bg-ai-soft p-3 shadow-[0_12px_30px_-12px_rgba(154,91,19,0.45)]">
        <p className="flex items-center gap-1 text-[11px] font-medium text-ai">
          <SparkleIcon size={11} /> Draft for you to approve
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink/85">“See you Thursday! We&apos;re up to chapter 9, so no spoilers past it.”</p>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-full bg-ai px-2.5 py-0.5 text-[11px] font-medium text-white">Approve</span>
          <span className="rounded-full border border-[#e6cfa9] px-2.5 py-0.5 text-[11px] font-medium text-ai">Edit</span>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{children}</p>
    </div>
  );
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}
function PollIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}
function ShelfIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 4v16M9 4v16M14 5l4 15M3 20h18" />
    </svg>
  );
}
