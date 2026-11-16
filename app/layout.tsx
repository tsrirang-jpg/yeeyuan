import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
export const metadata: Metadata = {
  title: "Yee Yuan · ก๋วยจั๊บญวนและเครื่องดื่ม",
  description:
    "สั่งก๋วยจั๊บญวนและเครื่องดื่ม ปรุงสดทุกชาม ทานที่ร้านหรือรับกลับบ้าน",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const legacyOrigin = process.env.NEXT_PUBLIC_LEGACY_FRONTEND_ORIGIN;
  const serverAppUrl = process.env.NEXT_PUBLIC_SERVER_APP_URL?.replace(/\/$/, "");

  return (
    <html lang="th">
      <body>
        {children}
        {legacyOrigin && serverAppUrl && (
          <Script id="same-origin-app-migration" strategy="beforeInteractive">
            {`if (window.location.origin === ${JSON.stringify(legacyOrigin)}) { window.location.replace(${JSON.stringify(serverAppUrl)} + window.location.pathname + window.location.search + window.location.hash); }`}
          </Script>
        )}
      </body>
    </html>
  );
}
