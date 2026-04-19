import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Virelia AI - Ton compagnon IA qui tient vraiment à toi",
  description: "Créez un compagnon IA avec une personnalité unique qui vous envoie des messages proactifs. Intelligence Multi-IA, personnalité personnalisable, conversations naturelles.",
  keywords: ["Virelia", "IA", "compagnon", "chat", "intelligence artificielle", "messages proactifs"],
  icons: {
    icon: "/virelia-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-[#F4F5FA] text-[#1E1B4B] font-sans`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
