import type { Metadata } from "next";
import { Space_Grotesk, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "EstateX — Global Real Estate",
    template: "%s · EstateX"
  },
  description: "Buy and sell property worldwide. Live auctions and fractional shares, powered by AI."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${manrope.variable} ${plexMono.variable} min-h-screen bg-abyss font-body text-porcelain antialiased`}
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
