import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F.R.I.D.A.Y. | Asistente Personal Digital",
  description: "Asistente personal digital inteligente de alta tecnología, elegante y futurista.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-slate-50 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
