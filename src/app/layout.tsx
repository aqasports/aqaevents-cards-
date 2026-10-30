import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

function getMetadataBase(): URL {
  try {
    const raw = process.env.PUBLIC_SITE_URL?.trim();
    if (raw && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      return new URL(raw);
    }
  } catch {}
  return new URL("https://aqasports.com");
}

export const metadata: Metadata = {
  title: {
    default: "AQA ERP",
    template: "%s | AQA ERP",
  },
  description: "AQA ERP — Enterprise Resource Planning for 1. AQA Sports Academy (AQA Swim), 2. AQA Events, and 3. AQA Store.",
  metadataBase: getMetadataBase(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved locale direction before first paint to avoid an LTR-to-RTL layout flip. No server cost. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var l=localStorage.getItem('aqa_locale');if(l==='en'||l==='fr'||l==='ar'){var d=document.documentElement;d.lang=l;d.dir=l==='ar'?'rtl':'ltr';}}catch(e){}",
          }}
        />
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
