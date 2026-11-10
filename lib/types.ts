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
  // A cover the host picked: an image URL found online, or a small uploaded
  // photo stored as a data: URL. Wins over coverId/isbn when set.
  cover?: string;
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

export type PastRead = {
  id: string;
  bookId: string;
  // When the club met to discuss it (ISO string).
  metAt: string;
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
  // Optional so clubs saved before this field existed keep loading.
  pastReads?: PastRead[];
};

export type ShelfEntry = {
  bookId: string;
  shelf: "read" | "to-read" | "currently-reading";
  rating?: number;
  // ISO dates. Optional so shelves saved before these existed keep loading.
  addedAt?: string;
  readAt?: string;
};

export type DB = {
  version: number;
  meId: string;
  users: User[];
  books: Book[];
  clubs: Club[];
  shelves: Record<string, ShelfEntry[]>;
  requested: string[];
};
