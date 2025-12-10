import "./globals.css";

export const metadata = {
  title: "GFSB Brexit Q&A",
  description: "Gibraltar Federation of Small Businesses Brexit FAQ Portal",
  icons: {
    icon: '/gfsb-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
