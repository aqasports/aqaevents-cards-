import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · AQA Swim",
    default: "AQA Swim · AQA Sports Academy",
  },
  description:
    "Portail officiel AQA Swim — Carte d'adhérent, plannings d'entraînement et suivi des séances à AQA Sports Academy.",
  openGraph: {
    title: "AQA Swim · AQA Sports Academy",
    description:
      "Portail officiel AQA Swim — Carte d'adhérent, plannings d'entraînement et suivi des séances à AQA Sports Academy.",
    url: "https://aqasports.com/swim",
    siteName: "AQA Sports Academy",
    images: [
      {
        url: "https://aqasports.com/image/face.png",
        width: 1200,
        height: 630,
        alt: "AQA Swim",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AQA Swim · AQA Sports Academy",
    description:
      "Portail officiel AQA Swim — Carte d'adhérent, plannings d'entraînement et suivi des séances à AQA Sports Academy.",
    images: ["https://aqasports.com/image/face.png"],
  },
};

export default function SwimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
