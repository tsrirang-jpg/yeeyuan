import type { Product } from "@/lib/types";
export type IconName =
  | "bowl"
  | "bag"
  | "cup"
  | "plate"
  | "search"
  | "arrow"
  | "qr"
  | "box"
  | "check";
const paths: Record<IconName, string> = {
  bowl: "M3 11h18c0 6-4 9-9 9s-9-3-9-9ZM7 4v3m5-4v4m5-3v3M6 21h12",
  bag: "M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1",
  cup: "M6 7h12l-2 14H8L6 7Zm-1 0h14M12 7l2-5h4",
  plate:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-4 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  qr: "M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h3v3h3v3h-6v-6Z",
  box: "m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10M7 4l10 6",
  check: "m5 12 4 4L19 6",
};
export function StoreIcon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function photoIndex(product: Pick<Product, "name" | "station">) {
  if (product.name.includes("ปากหม้อ")) return 6;
  if (product.name.includes("เล้ง")) return 7;
  if (product.name.includes("ข้าวสวย")) return 8;
  if (product.name.includes("น้ำดื่ม")) return 5;
  if (product.name.includes("มะนาว")) return 4;
  if (product.station === "DRINK") return 3;
  if (product.name.includes("ทอด")) return 2;
  if (product.name.includes("เด้ง") || product.name.includes("พิเศษ")) return 1;
  return 0;
}
export function FoodPhoto({
  product,
  index = 0,
  className = "",
}: {
  product?: Product;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={`ref-food-photo ref-photo-${product ? photoIndex(product) : index} ${className}`}
      role="img"
      aria-label={product?.name ?? "ก๋วยจั๊บญวนปรุงสด"}
    />
  );
}
