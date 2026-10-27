import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Scheduler",
  description: "Schedule and publish posts across your social platforms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
