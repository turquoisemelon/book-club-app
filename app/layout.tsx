import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { PendingInvite } from "@/components/pending-invite";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chapter Club",
  description: "Run your book club with an AI co-host that does the busywork.",
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
