import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "AQA Event Card",
    template: "%s · AQA Event Card",
  },
  description: "AQA Sports outdoor activity event card system — balance checking and admin management.",
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <I18nProvider>
          <div className="bg-glow-orb-1" />
          <div className="bg-glow-orb-2" />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
