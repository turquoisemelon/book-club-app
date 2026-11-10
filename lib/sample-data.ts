import type { Book, Club, DB, User } from "./types";
import { questionsFor } from "./cohost";

export const CITY = "your city";
export const DB_VERSION = 5;

const users: User[] = [
  { id: "u-me", name: "Meltem", color: "#2f5d50" },
  { id: "u-priya", name: "Priya", color: "#b5651d" },
  { id: "u-daniel", name: "Daniel", color: "#5b6abf" },
  { id: "u-sofia", name: "Sofia", color: "#a23b72" },
  { id: "u-marcus", name: "Marcus", color: "#3c7a3a" },
  { id: "u-lena", name: "Lena", color: "#8a6d1f" },
  { id: "u-omar", name: "Omar", color: "#2d7d9a" },
  { id: "u-june", name: "June", color: "#9b4d3c" },
  { id: "u-theo", name: "Theo", color: "#6b4f9e" },
];

const books: Book[] = [
  {
    id: "b-klara",
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    isbn: "9780593318171",
    pages: 303,
    sections: 6,
    sectionLabel: "Part",
    blurb: "An Artificial Friend watches the world from a store window, hoping to be chosen.",
  },
  {
    id: "b-piranesi",
    title: "Piranesi",
    author: "Susanna Clarke",
    isbn: "9781635575637",
    pages: 272,
    sections: 7,
    sectionLabel: "Part",
    blurb: "A man lives in an endless House of halls and tides, keeping a careful journal.",
  },
  {
    id: "b-tomorrow",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    isbn: "9780593321201",
    pages: 416,
    sections: 10,
    sectionLabel: "Part",
    blurb: "Two friends build video games together over thirty years.",
  },
  {
    id: "b-demon",
    title: "Demon Copperhead",
    author: "Barbara Kingsolver",
    isbn: "9780063251922",
    pages: 560,
    sections: 60,
    sectionLabel: "Chapter",
    blurb: "A boy born in Appalachia tells his own story, after David Copperfield.",
  },
  {
    id: "b-chemistry",
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    isbn: "9780385547345",
    pages: 400,
    sections: 46,
    sectionLabel: "Chapter",
    blurb: "A chemist in the 1960s ends up hosting a TV cooking show.",
  },
  {
    id: "b-creatures",
    title: "Remarkably Bright Creatures",
    author: "Shelby Van Pelt",
    isbn: "9780063204157",
    pages: 368,
    sections: 40,
    sectionLabel: "Chapter",
    blurb: "A widow working nights at an aquarium befriends a very clever octopus.",
  },
  {
    id: "b-covenant",
    title: "The Covenant of Water",
    author: "Abraham Verghese",
    isbn: "9780802162175",
    pages: 724,
    sections: 80,
    sectionLabel: "Chapter",
    blurb: "Three generations of a family in South India.",
  },
  {
    id: "b-hailmary",
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn: "9780593135204",
    pages: 496,
    sections: 30,
    sectionLabel: "Chapter",
  },
  {
    id: "b-vegetarian",
    title: "The Vegetarian",
    author: "Han Kang",
    isbn: "9781101906118",
    pages: 188,
    sections: 3,
    sectionLabel: "Part",
  },
  {
    id: "b-sweetgrass",
    title: "Braiding Sweetgrass",
    author: "Robin Wall Kimmerer",
    isbn: "9781571313560",
    pages: 408,
    sections: 32,
    sectionLabel: "Chapter",
  },
  {
    id: "b-booklovers",
    title: "Book Lovers",
    author: "Emily Henry",
    isbn: "9780593334836",
    pages: 384,
    sections: 30,
    sectionLabel: "Chapter",
  },
  {
    id: "b-intermezzo",
    title: "Intermezzo",
    author: "Sally Rooney",
    isbn: "9780374602635",
    pages: 448,
    sections: 6,
    sectionLabel: "Part",
  },
];

function daysFrom(now: Date, days: number, hour = 19) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function directoryClub(
  id: string,
  name: string,
  description: string,
  neighbourhood: string,
  cadence: string,
  bookId: string,
  memberIds: string[],
  sizeCap: number,
  nextMeetup: string,
  place: string,
): Club {
  return {
    id,
    name,
    description,
    neighbourhood,
    cadence,
    openToMembers: true,
    sizeCap,
    members: memberIds.map((userId, i) => ({ userId, role: i === 0 ? "host" : "member", progress: 0 })),
    currentBookId: bookId,
    polls: [],
    meetups: [{ id: `${id}-m1`, date: nextMeetup, place, upTo: 25, rsvps: {} }],
    threads: [],
    drafts: [],
    announcements: [],
    joinRequests: [],
  };
}

export function makeSampleDB(now = new Date()): DB {
  const klara = books[0];
  const firstMeetup = daysFrom(now, 9);

  const myClub: Club = {
    id: "c-sunday",
    name: "Sunday Pages",
    description: "Literary fiction, good snacks, no pressure to finish.",
    neighbourhood: "Near the park",
    cadence: "Every 3 weeks",
    openToMembers: false,
    sizeCap: 10,
    members: [
      { userId: "u-me", role: "host", progress: 25 },
      { userId: "u-priya", role: "member", progress: 50 },
      { userId: "u-daniel", role: "member", progress: 25 },
      { userId: "u-sofia", role: "member", progress: 25 },
      { userId: "u-marcus", role: "member", progress: 0 },
    ],
    currentBookId: klara.id,
    polls: [
      {
        id: "p-1",
        status: "closed",
        winnerBookId: klara.id,
        createdAt: daysFrom(now, -12),
        options: [
          { bookId: "b-klara", votes: ["u-me", "u-priya", "u-sofia"] },
          { bookId: "b-tomorrow", votes: ["u-daniel"] },
          { bookId: "b-covenant", votes: ["u-marcus"] },
        ],
      },
    ],
    meetups: [
      {
        id: "m-1",
        date: firstMeetup,
        place: "Priya's place",
        videoLink: "https://meet.google.com/",
        upTo: 50,
        rsvps: { "u-me": "yes", "u-priya": "yes", "u-sofia": "maybe" },
      },
      {
        id: "m-2",
        date: daysFrom(now, 30),
        place: "The corner café",
        upTo: 100,
        rsvps: {},
      },
    ],
    threads: [
      {
        id: "t-1",
        bookId: "b-klara",
        title: "First impressions (no spoilers)",
        gate: 0,
        posts: [
          { id: "po-1", userId: "u-priya", text: "Klara's voice got me from page one. So calm and so observant.", at: daysFrom(now, -5, 20) },
          { id: "po-2", userId: "u-daniel", text: "Just started. Loving the store window chapters so far.", at: daysFrom(now, -3, 9) },
        ],
      },
      {
        id: "t-2",
        bookId: "b-klara",
        title: "Part Two: the move to Josie's house",
        gate: 25,
        posts: [
          { id: "po-3", userId: "u-sofia", text: "The Mother made me so uneasy in this part. Anyone else?", at: daysFrom(now, -2, 21) },
          { id: "po-4", userId: "u-me", text: "Yes! Every question she asks Klara feels like a test.", at: daysFrom(now, -2, 22) },
        ],
      },
      {
        id: "t-3",
        bookId: "b-klara",
        title: "Part Three onwards",
        gate: 50,
        posts: [
          { id: "po-5", userId: "u-priya", text: "Okay, that trip into town. I have thoughts.", at: daysFrom(now, -1, 18) },
        ],
      },
    ],
    drafts: [
      {
        id: "d-1",
        kind: "questions",
        title: "Discussion questions for the first half",
        body: questionsFor(klara, 50),
        status: "pending",
        createdAt: daysFrom(now, 0, 8),
        meetupId: "m-1",
        gate: 50,
      },
    ],
    announcements: [
      {
        id: "a-1",
        text: `Klara and the Sun won the poll! Let's read the first half for our first meetup at Priya's place.`,
        at: daysFrom(now, -11, 10),
        aiDrafted: true,
      },
    ],
    joinRequests: [],
  };

  const directory: Club[] = [
    directoryClub("c-scifi", "Sci-Fi & Wine", "Big ideas, small pours. Mostly science fiction, the odd fantasy.", "Downtown", "Monthly, Thursdays", "b-hailmary", ["u-omar", "u-june", "u-theo", "u-lena"], 8, daysFrom(now, 6), "Cellar wine bar"),
    directoryClub("c-slow", "Slow Readers Society", "One short book a month. Nobody is judged for not finishing.", "East side", "Monthly, Sunday mornings", "b-vegetarian", ["u-lena", "u-june", "u-marcus"], 12, daysFrom(now, 11, 10), "Library meeting room"),
    directoryClub("c-nature", "Nature Writing Circle", "Nonfiction about plants, animals and place. Walks sometimes.", "West end", "Every 6 weeks", "b-sweetgrass", ["u-theo", "u-omar", "u-sofia", "u-june", "u-daniel"], 10, daysFrom(now, 16, 14), "Greenhouse café"),
    directoryClub("c-romance", "Romance After Dark", "Rom-coms, swoons and very honest opinions.", "North end", "Every 3 weeks", "b-booklovers", ["u-june", "u-lena"], 8, daysFrom(now, 4, 20), "Video call"),
    directoryClub("c-newfic", "Contemporary Fiction Club", "New releases while everyone's still talking about them.", "Downtown", "Monthly", "b-intermezzo", ["u-daniel", "u-theo", "u-priya", "u-omar", "u-lena", "u-marcus"], 9, daysFrom(now, 20), "Bookshop back room"),
  ];

  return {
    version: DB_VERSION,
    meId: "u-me",
    users,
    books,
    clubs: [myClub, ...directory],
    shelves: {
      "u-me": [{ bookId: "b-piranesi", shelf: "to-read" }, { bookId: "b-creatures", shelf: "to-read" }],
      "u-priya": [{ bookId: "b-chemistry", shelf: "to-read" }, { bookId: "b-piranesi", shelf: "to-read" }],
      "u-daniel": [{ bookId: "b-tomorrow", shelf: "to-read" }, { bookId: "b-demon", shelf: "to-read" }],
      "u-sofia": [{ bookId: "b-creatures", shelf: "to-read" }, { bookId: "b-piranesi", shelf: "to-read" }],
      "u-marcus": [{ bookId: "b-covenant", shelf: "to-read" }, { bookId: "b-demon", shelf: "to-read" }],
    },
    requested: [],
  };
}
