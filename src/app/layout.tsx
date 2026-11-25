import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Future Post Office",
  description:
    "Seal digital letters for a future day — for yourself or someone you love.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-ink">
        <Suspense
          fallback={
            <header className="border-b border-ink/10 bg-parchment/70 px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-5xl font-display text-lg text-ink">
                Future Post Office
              </div>
            </header>
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="relative flex-1">{children}</main>
        <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/45">
          Future Post Office — letters that wait. Contents never leave the vault early.
        </footer>
      </body>
    </html>
  );
}
