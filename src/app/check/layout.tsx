import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "AQA Club Terminal",
  description: "Club attendance check-in terminal for AQA Sports events",
};

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0f1a" }}>
        {children}
      </body>
    </html>
  );
}
