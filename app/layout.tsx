import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { PendingInvite } from "@/components/pending-invite";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

// Shown in search results and link previews (WhatsApp, iMessage, Slack, X...).
// The preview image is app/opengraph-image.tsx.
const shareTitle = "Chapter Club: for book clubs that actually meet";
const shareDescription = "Pick the next book, set the date and keep the talk spoiler-free. A calm home for your reading group.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chapterclub.app"),
  title: "Chapter Club",
  description: shareDescription,
  openGraph: {
    type: "website",
    siteName: "Chapter Club",
    title: shareTitle,
    description: shareDescription,
  },
  twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription },
  appleWebApp: { capable: true, title: "Chapter Club", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} antialiased`}>
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-md bg-paper shadow-[0_0_40px_rgba(0,0,0,0.06)]">
          <AuthProvider>
            <PendingInvite />
            <StoreProvider>{children}</StoreProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
