import type { Metadata } from "next";
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
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
