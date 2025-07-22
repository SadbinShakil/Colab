import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaperPal - Revolutionary AI-Powered Research Collaboration Platform",
  description: "Transform research collaboration with real-time annotations, AI-powered insights, expertise matching, and intelligent discussion facilitation. The future of academic research is here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '14px',
            }
          }}
        />
      </body>
    </html>
  );
}
