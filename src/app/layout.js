import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "GFSB Brexit FAQ",
  description: "Gibraltar Federation of Small Businesses Brexit FAQ Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable} suppressHydrationWarning>{children}</body>
    </html>
  );
}
