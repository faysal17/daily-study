import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/confirm";

export const metadata: Metadata = {
  title: "Study Tracker",
  description: "What to study today.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="en">
      <head>
        {supabaseUrl && (
          <link rel="preconnect" href={supabaseUrl} crossOrigin="" />
        )}
      </head>
      <body>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
