import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Професійна хімія та обладнання для хімчистки",
  description: "Хімія, інвентар, обладнання, відеопояснення та навчання для хімчистки меблів і авто.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
