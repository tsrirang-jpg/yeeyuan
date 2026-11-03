export type Mode = "DINE_IN" | "TAKEAWAY";
export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "QUEUED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "ON_HOLD";
export type Choice = {
  id: string;
  label: string;
  priceDeltaSatang: number;
  active: boolean;
};
export type OptionGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  choices: Choice[];
};
export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceSatang: number;
  station: "FOOD" | "DRINK";
  active: boolean;
  soldOut: boolean;
  optionGroups: OptionGroup[];
  version: number;
};
export type Menu = {
  catalogVersion: number;
  categories: { id: string; name: string }[];
  products: Product[];
};
export type CartItem = {
  key: string;
  productId: string;
  quantity: number;
  optionChoiceIds: string[];
  note: string;
};
export type QuoteRequest = {
  mode: Mode;
  visitId?: string;
  items: Omit<CartItem, "key">[];
};
export type Quote = {
  id: string;
  subtotalSatang: number;
  packagingFeeSatang: number;
  totalSatang: number;
  expiresAt: string;
  lines: { name: string; lineTotalSatang: number }[];
};
export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  lineTotalSatang: number;
  station: "FOOD" | "DRINK";
  note: string;
  options: { label: string }[];
};
export type Payment = {
  id: string;
  status:
    | "CREATING"
    | "UNKNOWN"
    | "PENDING"
    | "SUCCEEDED"
    | "FAILED"
    | "EXPIRED";
  amountSatang: number;
  expiresAt: string;
  qrUrl: string | null;
  demo?: boolean;
};
export type Order = {
  id: string;
  code: string;
  mode: Mode;
  status: OrderStatus;
  paymentStatus: string;
  totalSatang: number;
  subtotalSatang: number;
  packagingFeeSatang: number;
  paymentDeadline: string;
  pickupName: string;
  pickupCode?: string;
  items: OrderItem[];
  createdAt: string;
  version: number;
  paymentAttempts?: Payment[];
};
export type Ticket = {
  id: string;
  orderId: string;
  orderCode: string;
  station: string;
  status: "QUEUED" | "PREPARING" | "READY" | "CANCELLED";
  version: number;
  mode: Mode;
  createdAt: string;
  items: { name: string; quantity: number; note: string; options: string[] }[];
};
export type Store = {
  name: string;
  acceptingOrders: boolean;
  packagingFeeSatang: number;
  paymentMode: "MOCK" | "OMISE";
};
export const money = (satang: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: satang % 100 ? 2 : 0,
  }).format(satang / 100);
export const statusText: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "รอชำระเงิน",
  QUEUED: "ร้านรับออเดอร์แล้ว",
  PREPARING: "กำลังปรุง",
  READY: "พร้อมรับแล้ว",
  COMPLETED: "ส่งมอบแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
  EXPIRED: "หมดเวลาชำระ",
  ON_HOLD: "รอร้านตรวจสอบ",
};
