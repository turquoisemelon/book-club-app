import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The card shown when a chapterclub.app link is shared (WhatsApp, iMessage, Slack, X...).
// Rendered once at build time.
export const alt = "Chapter Club: for book clubs that actually meet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const paper = "#faf6ef";
const ink = "#1f2a24";
const muted = "#6b6f68";
const accent = "#2f5d50";

const covers = [
  { title: "The Quiet Year", author: "M. Arden", color: "#9a5b13", x: 0, y: 70, rotate: -8 },
  { title: "Salt & Ink", author: "R. Okafor", color: "#2f5d50", x: 150, y: 20, rotate: 3 },
  { title: "Small Hours", author: "L. Demir", color: "#7a3b52", x: 290, y: 90, rotate: 10 },
];

export default async function OpengraphImage() {
  const fonts = join(process.cwd(), "assets/fonts");
  const [serif, serifItalic, sans] = await Promise.all([
    readFile(join(fonts, "Fraunces-SemiBold.ttf")),
    readFile(join(fonts, "Fraunces-SemiBoldItalic.ttf")),
    readFile(join(fonts, "Inter-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: paper, padding: "64px 72px", fontFamily: "Inter", color: ink }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 512 512">
              <rect width="512" height="512" rx="112" fill={accent} />
              <path d="M128 156c48-20 92-20 128 8v196c-36-28-80-28-128-8z" fill={paper} />
              <path d="M384 156c-48-20-92-20-128 8v196c36-28 80-28 128-8z" fill="#e4eee9" />
            </svg>
            <span style={{ fontFamily: "Fraunces", fontSize: 40 }}>Chapter Club</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Fraunces", fontSize: 68, lineHeight: 1.05, letterSpacing: -1.5 }}>For book clubs</span>
            <span style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 68, lineHeight: 1.05, letterSpacing: -1.5, color: accent }}>that actually meet.</span>
            <span style={{ marginTop: 28, fontSize: 30, lineHeight: 1.4, color: muted }}>Pick the next book, set the date and keep the talk spoiler-free.</span>
          </div>
          <span style={{ fontSize: 26, color: accent }}>chapterclub.app</span>
        </div>
        <div style={{ display: "flex", position: "relative", flex: 1 }}>
          {covers.map((c) => (
            <div
              key={c.title}
              style={{
                position: "absolute",
                left: c.x,
                top: c.y,
                width: 180,
                height: 270,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "22px 18px 18px 26px",
                borderRadius: 12,
                color: "white",
                background: c.color,
                backgroundImage: `linear-gradient(160deg, ${c.color}, ${ink})`,
                boxShadow: "0 18px 40px -12px rgba(31,42,36,0.5)",
                transform: `rotate(${c.rotate}deg)`,
              }}
            >
              <span style={{ fontFamily: "Fraunces", fontSize: 28, lineHeight: 1.1 }}>{c.title}</span>
              <span style={{ fontSize: 17, opacity: 0.8 }}>{c.author}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: serif, style: "normal", weight: 600 },
        { name: "Fraunces", data: serifItalic, style: "italic", weight: 600 },
        { name: "Inter", data: sans, style: "normal", weight: 500 },
      ],
    },
  );
}
