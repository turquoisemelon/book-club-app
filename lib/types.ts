export type Role = "host" | "member";

export type User = {
  id: string;
  name: string;
  color: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverId?: number;
  pages?: number;
  sections: number;
  sectionLabel: "Chapter" | "Part";
  blurb?: string;
};

export type Membership = {
  userId: string;
  role: Role;
  progress: number;
};

export type PollOption = {
  bookId: string;
  votes: string[];
};

export type Poll = {
  id: string;
  status: "open" | "closed";
  options: PollOption[];
  winnerBookId?: string;
  createdAt: string;
};

export type Rsvp = "yes" | "maybe" | "no";

export type Meetup = {
  id: string;
  date: string;
  place: string;
  videoLink?: string;
  upTo: number;
  rsvps: Record<string, Rsvp>;
};

export type Post = {
  id: string;
  userId: string;
  text: string;
  at: string;
  aiDrafted?: boolean;
};

export type Thread = {
  id: string;
  bookId?: string;
  title: string;
  gate: number;
  posts: Post[];
};

export type DraftKind = "questions" | "reminder" | "shortlist" | "schedule" | "recap";

export type Draft = {
  id: string;
  kind: DraftKind;
  title: string;
  body: string;
  status: "pending" | "approved" | "discarded";
  createdAt: string;
  meetupId?: string;
  gate?: number;
  bookIds?: string[];
};

export type Announcement = {
  id: string;
  text: string;
  at: string;
  aiDrafted?: boolean;
};

export type Club = {
  id: string;
  name: string;
  description: string;
  neighbourhood: string;
  cadence: string;
  openToMembers: boolean;
  sizeCap: number;
  members: Membership[];
  currentBookId?: string;
  polls: Poll[];
  meetups: Meetup[];
  threads: Thread[];
  drafts: Draft[];
  announcements: Announcement[];
  joinRequests: string[];
};

export type ShelfEntry = {
  bookId: string;
  shelf: "read" | "to-read" | "currently-reading";
  rating?: number;
};

export type DB = {
  version: number;
  meId: string;
  viewAs: Role;
  users: User[];
  books: Book[];
  clubs: Club[];
  shelves: Record<string, ShelfEntry[]>;
  requested: string[];
};
