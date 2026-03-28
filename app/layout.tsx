import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, TAGLINE } from "@/constants";
import { BottomNavContainer } from "@/components/BottomNavContainer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${inter.variable} antialiased bg-[#0F0F1B] text-white`}
        suppressHydrationWarning={true}
      >
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <BottomNavContainer />
        </div>
      </body>
    </html>
  );
}
