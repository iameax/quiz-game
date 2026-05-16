import "./globals.css";
import { Amiri } from "next/font/google";

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata = { title: "Quiz Game" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={amiri.variable}>
      <body>{children}</body>
    </html>
  );
}
