import type { Book } from "./types";

export function coverUrl(book: Book, size: "S" | "M" | "L" = "M") {
  if (book.cover) return book.cover;
  if (book.coverId) return `https://covers.openlibrary.org/b/id/${book.coverId}-${size}.jpg?default=false`;
  if (book.isbn) return `https://covers.openlibrary.org/b/isbn/${book.isbn}-${size}.jpg?default=false`;
  return undefined;
}

type SearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
};

export async function searchOpenLibrary(query: string, signal?: AbortSignal): Promise<Book[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,isbn,number_of_pages_median&limit=8`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const data = (await res.json()) as { docs: SearchDoc[] };
  return data.docs.map((d) => ({
    id: `ol-${d.key.replace("/works/", "")}`,
    title: d.title,
    author: d.author_name?.[0] ?? "Unknown author",
    coverId: d.cover_i,
    isbn: d.isbn?.find((i) => i.length === 13),
    pages: d.number_of_pages_median,
    sections: 20,
    sectionLabel: "Chapter",
  }));
}

export type CoverOption = {
  url: string;
  title: string;
  author?: string;
  source: "Open Library" | "Google Books";
};

async function openLibraryCovers(title: string, author: string, signal?: AbortSignal): Promise<CoverOption[]> {
  const params = new URLSearchParams({ title, fields: "title,author_name,cover_i", limit: "12" });
  if (author) params.set("author", author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const data = (await res.json()) as { docs: { title: string; author_name?: string[]; cover_i?: number }[] };
  return data.docs
    .filter((d) => d.cover_i)
    .map((d) => ({ url: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`, title: d.title, author: d.author_name?.[0], source: "Open Library" as const }));
}

type GoogleVolume = { volumeInfo: { title: string; authors?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };

async function googleBooksCovers(title: string, author: string, signal?: AbortSignal): Promise<CoverOption[]> {
  // Google Books has good coverage of Turkish and other non-English editions.
  const q = `intitle:${title}${author ? ` inauthor:${author}` : ""}`;
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books`, { signal });
  if (!res.ok) throw new Error(`Google Books returned ${res.status}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).flatMap(({ volumeInfo: v }) => {
    const link = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
    if (!link) return [];
    return [{ url: link.replace(/^http:/, "https:").replace("&edge=curl", ""), title: v.title, author: v.authors?.[0], source: "Google Books" as const }];
  });
}

// Looks a book up in Open Library and Google Books at the same time and
// returns every cover found. Fails only when both sources fail.
export async function searchCovers(title: string, author: string, signal?: AbortSignal): Promise<CoverOption[]> {
  const t = title.trim();
  const a = author.trim();
  const settled = await Promise.allSettled([googleBooksCovers(t, a, signal), openLibraryCovers(t, a, signal)]);
  if (settled.every((r) => r.status === "rejected")) throw (settled[0] as PromiseRejectedResult).reason;
  const seen = new Set<string>();
  const lists = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  // Interleave the two sources so both show up near the top.
  const out: CoverOption[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
    for (const list of lists) {
      const c = list[i];
      if (c && !seen.has(c.url)) {
        seen.add(c.url);
        out.push(c);
      }
    }
  }
  return out.slice(0, 18);
}

// Shrinks a photo to a small JPEG so it fits in the browser's storage
// (about 20 KB instead of several MB straight off a phone camera).
export async function shrinkImage(file: File, maxHeight = 360): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxHeight / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

// Goodreads exports a CSV with quoted fields and ISBNs written as ="978...".
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

export type ImportRow = {
  book: Book;
  shelf: "read" | "to-read" | "currently-reading";
  rating?: number;
  matched: boolean;
};

export function parseGoodreads(text: string): ImportRow[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const iTitle = col("Title");
  const iAuthor = col("Author");
  const iIsbn13 = col("ISBN13");
  const iIsbn = col("ISBN");
  const iShelf = col("Exclusive Shelf");
  const iRating = col("My Rating");
  const iPages = col("Number of Pages");
  const iId = col("Book Id");
  if (iTitle < 0 || iAuthor < 0) throw new Error("This doesn't look like a Goodreads export: no Title or Author column.");

  const clean = (v: string | undefined) => (v ?? "").replace(/^="?|"$/g, "").trim();
  return rows.map((r, n) => {
    const isbn = clean(r[iIsbn13]) || clean(r[iIsbn]);
    const shelfRaw = clean(r[iShelf]);
    const shelf = shelfRaw === "read" || shelfRaw === "currently-reading" ? shelfRaw : "to-read";
    const rating = Number(clean(r[iRating])) || undefined;
    const pages = Number(clean(r[iPages])) || undefined;
    return {
      book: {
        id: `gr-${clean(r[iId]) || n}`,
        title: clean(r[iTitle]).replace(/\s*\(.*?#\d+\)$/, ""),
        author: clean(r[iAuthor]),
        isbn: isbn || undefined,
        pages,
        sections: 20,
        sectionLabel: "Chapter" as const,
      },
      shelf,
      rating,
      matched: Boolean(isbn),
    };
  });
}

export const SAMPLE_GOODREADS_CSV = `Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies
1,"Piranesi","Susanna Clarke","Clarke, Susanna",,"=""1635575636""","=""9781635575637""",5,4.24,Bloomsbury,Hardcover,272,2020,2020,2024/03/02,2024/01/10,,,read,,,,1,0
2,"Remarkably Bright Creatures","Shelby Van Pelt","Van Pelt, Shelby",,"=""0063204150""","=""9780063204157""",0,4.32,Ecco,Hardcover,368,2022,2022,,2025/06/01,to-read,to-read (#3),to-read,,,,0,0
3,"The Covenant of Water","Abraham Verghese","Verghese, Abraham",,"=""0802162177""","=""9780802162175""",0,4.48,Grove Press,Hardcover,724,2023,2023,,2025/02/14,to-read,to-read (#1),to-read,,,,0,0
4,"Intermezzo","Sally Rooney","Rooney, Sally",,"=""0374602638""","=""9780374602635""",4,3.98,FSG,Hardcover,448,2024,2024,2025/01/20,2024/09/24,,,read,,,,1,0
5,"A Book With No ISBN","Small Press Author","Author, Small Press",,"=""""","=""""",0,4.10,Small Press,Paperback,210,2019,2019,,2025/08/08,to-read,to-read (#4),to-read,,,,0,0
`;
