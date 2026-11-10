// Prototype co-host: drafts come from templates so the flow can be tried
// without an API key. The real app replaces each function with a Claude call
// that gets the same inputs.
import type { Book, Club, Meetup, User } from "./types";
import { formatDay, formatTime } from "./format";
import { spanLabel } from "./progress";

// upTo: how far into the book (in %) a question is spoiler-safe.
const KLARA_QUESTIONS: { upTo: number; text: string }[] = [
  { upTo: 25, text: "Klara learns about people by watching them through the store window. What did her way of seeing show you about the humans around her?" },
  { upTo: 25, text: "Why do you think Josie chooses Klara over a newer model?" },
  { upTo: 50, text: "How did your feelings about the Mother change once Klara moved into the house?" },
  { upTo: 50, text: "Klara treats the Sun almost like a god. Did her faith read as naive, moving, or both?" },
  { upTo: 50, text: "Rick and Josie's friendship is shaped by who is 'lifted' and who is not. What does the book seem to say about that divide?" },
  { upTo: 100, text: "By the end, what do you think Ishiguro is saying about what makes a person irreplaceable?" },
];

export function questionsFor(book: Book, upTo: number): string {
  const label = spanLabel(upTo);
  const specific = book.id === "b-klara" ? KLARA_QUESTIONS.filter((q) => q.upTo <= upTo).map((q) => q.text) : [];
  const generic = [
    `Which moment in ${label} has stayed with you most, and why?`,
    `Who did you find yourself rooting for so far? Has that changed?`,
    `Was there a line or passage you marked? Bring it to read aloud.`,
    `What do you think ${book.author} wants us to notice that the characters don't?`,
    `If you had to describe ${book.title} so far to a friend in one sentence, what would it be?`,
  ];
  const picked = [...specific, ...generic].slice(0, 5);
  return [
    `Here are a few questions for our meetup, covering ${label} only, so no spoilers past that.`,
    "",
    ...picked.map((q, i) => `${i + 1}. ${q}`),
  ].join("\n");
}

export function reminderFor(club: Club, meetup: Meetup, book: Book | undefined, users: User[]): string {
  const yes = Object.entries(meetup.rsvps)
    .filter(([, r]) => r === "yes")
    .map(([id]) => users.find((u) => u.id === id)?.name)
    .filter(Boolean);
  const unanswered = club.members.filter((m) => !meetup.rsvps[m.userId]).length;
  const reading = book ? ` We're discussing ${spanLabel(meetup.upTo)} of ${book.title}.` : "";
  const lines = [
    `Reminder: we meet ${formatDay(meetup.date)} at ${formatTime(meetup.date)}, ${meetup.place}.${reading}`,
  ];
  if (yes.length) lines.push(`Coming so far: ${yes.join(", ")}.`);
  if (unanswered) lines.push(`${unanswered} of you haven't replied yet, so tap yes, maybe or no on the meetup.`);
  if (meetup.videoLink) lines.push(`Can't make it in person? Join on video: ${meetup.videoLink}`);
  return lines.join("\n\n");
}

export function shortlistFor(club: Club, shelves: Record<string, { bookId: string; shelf: string }[]>, books: Book[]) {
  const counts = new Map<string, number>();
  for (const m of club.members) {
    for (const entry of shelves[m.userId] ?? []) {
      if (entry.shelf !== "to-read" || entry.bookId === club.currentBookId) continue;
      counts.set(entry.bookId, (counts.get(entry.bookId) ?? 0) + 1);
    }
  }
  const read = new Set(club.polls.map((p) => p.winnerBookId));
  const ranked = [...counts.entries()]
    .filter(([id]) => !read.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const bookIds = ranked.map(([id]) => id);
  const lines = ranked.map(([id, n]) => {
    const b = books.find((x) => x.id === id)!;
    return `• ${b.title} by ${b.author}: on ${n} member${n > 1 ? "s'" : "'s"} want-to-read list${b.pages ? `, ${b.pages} pages` : ""}`;
  });
  const body = [
    "Three picks for our next book, based on what's on everyone's want-to-read shelves:",
    "",
    ...lines,
    "",
    "Approving this opens a poll with these three.",
  ].join("\n");
  return { bookIds, body };
}

export function scheduleFor(book: Book, meetups: Meetup[]): string {
  const upcoming = meetups.slice(0, 2);
  if (upcoming.length === 0) return `${book.title} won the poll! Next step: pick a meetup date.`;
  const parts = upcoming.length === 1 ? ["the whole book"] : ["the first half", "the second half"];
  const lines = upcoming.map((m, i) => `• ${formatDay(m.date)}: ${parts[i]}`);
  return [`${book.title} won the poll! Here's a reading plan:`, "", ...lines].join("\n");
}

export function recapFor(notes: string, book: Book | undefined): string {
  const points = notes
    .split(/\n|\.\s/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 3)
    .slice(0, 6);
  return [
    `Thanks for a great meetup${book ? ` on ${book.title}` : ""}! A few things we talked about:`,
    "",
    ...points.map((p) => `• ${p.charAt(0).toUpperCase()}${p.slice(1)}`),
    "",
    "See you next time.",
  ].join("\n");
}
