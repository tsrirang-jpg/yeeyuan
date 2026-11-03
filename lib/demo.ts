import { demoMenu } from "./catalog";
import type { Order, Payment, Quote, QuoteRequest, Ticket } from "./types";
const storage = "yeeyuan-demo-v1";
type State = {
  orders: Order[];
  quotes: Record<string, { quote: Quote; request: QuoteRequest }>;
  payments: Record<string, Payment>;
  tickets: Ticket[];
};
const read = (): State =>
  JSON.parse(
    localStorage.getItem(storage) ||
      '{"orders":[],"quotes":{},"payments":{},"tickets":[]}',
  );
const write = (s: State) => localStorage.setItem(storage, JSON.stringify(s));
export function demoQuote(request: QuoteRequest): Quote {
  if (!request.items.length || request.items.length > 20)
    throw new Error("กรุณาเลือกสินค้า 1 ถึง 20 รายการ");
  const lines = request.items.map((item) => {
    const p = demoMenu.products.find((p) => p.id === item.productId);
    if (!p || p.soldOut || !p.active) throw new Error("สินค้านี้ไม่พร้อมขาย");
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    )
      throw new Error("จำนวนสินค้าไม่ถูกต้อง");
    const allowed = p.optionGroups.flatMap((g) => g.choices);
    if (
      new Set(item.optionChoiceIds).size !== item.optionChoiceIds.length ||
      item.optionChoiceIds.some((id) => !allowed.some((c) => c.id === id))
    )
      throw new Error("ตัวเลือกสินค้าไม่ถูกต้อง");
    p.optionGroups.forEach((g) => {
      const n = g.choices.filter((c) =>
        item.optionChoiceIds.includes(c.id),
      ).length;
      if (n < g.minSelect || n > g.maxSelect)
        throw new Error(`กรุณาเลือก ${g.name} ให้ครบ`);
    });
    const delta = allowed
      .filter((c) => item.optionChoiceIds.includes(c.id))
      .reduce((s, c) => s + c.priceDeltaSatang, 0);
    return {
      name: p.name,
      lineTotalSatang: (p.priceSatang + delta) * item.quantity,
    };
  });
  const subtotalSatang = lines.reduce((s, l) => s + l.lineTotalSatang, 0),
    packagingFeeSatang = request.mode === "TAKEAWAY" ? 500 : 0;
  const quote = {
    id: crypto.randomUUID(),
    subtotalSatang,
    packagingFeeSatang,
    totalSatang: subtotalSatang + packagingFeeSatang,
    expiresAt: new Date(Date.now() + 120000).toISOString(),
    lines,
  };
  if (quote.totalSatang < 2000)
    throw new Error("ยอดชำระขั้นต่ำ 20 บาท กรุณาเพิ่มสินค้า");
  const s = read();
  s.quotes[quote.id] = { quote, request };
  write(s);
  return quote;
}
export function demoCreate(
  quoteId: string,
  pickupName: string,
  key: string,
): Order {
  const s = read();
  const old = s.orders.find((o) => o.id === key);
  if (old) return old;
  const entry = s.quotes[quoteId];
  if (!entry || Date.parse(entry.quote.expiresAt) < Date.now())
    throw new Error("ราคาหมดอายุ กรุณาตรวจรายการใหม่");
  const { request, quote } = entry;
  const order: Order = {
    id: key,
    code: `Q${String(s.orders.length + 1).padStart(6, "0")}`,
    mode: request.mode,
    status: "AWAITING_PAYMENT",
    paymentStatus: "UNPAID",
    subtotalSatang: quote.subtotalSatang,
    packagingFeeSatang: quote.packagingFeeSatang,
    totalSatang: quote.totalSatang,
    paymentDeadline: new Date(Date.now() + 600000).toISOString(),
    pickupName,
    pickupCode: String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
    ).padStart(6, "0"),
    createdAt: new Date().toISOString(),
    version: 0,
    items: request.items.map((i, n) => {
      const p = demoMenu.products.find((p) => p.id === i.productId)!;
      return {
        id: crypto.randomUUID(),
        name: p.name,
        quantity: i.quantity,
        station: p.station,
        note: i.note,
        lineTotalSatang: quote.lines[n].lineTotalSatang,
        options: p.optionGroups
          .flatMap((g) => g.choices)
          .filter((c) => i.optionChoiceIds.includes(c.id))
          .map((c) => ({ label: c.label })),
      };
    }),
  };
  s.orders.unshift(order);
  delete s.quotes[quoteId];
  write(s);
  return order;
}
export const demoOrders = () => read().orders;
export function demoPayment(id: string): Payment {
  const s = read();
  const o = s.orders.find((o) => o.id === id);
  if (!o) throw new Error("ไม่พบออเดอร์");
  if (s.payments[id]) return s.payments[id];
  const p: Payment = {
    id: crypto.randomUUID(),
    status: "PENDING",
    amountSatang: o.totalSatang,
    expiresAt: o.paymentDeadline,
    qrUrl: null,
    demo: true,
  };
  s.payments[id] = p;
  write(s);
  return p;
}
export function demoPay(id: string) {
  const s = read();
  const o = s.orders.find((o) => o.id === id);
  if (!o || Date.parse(o.paymentDeadline) < Date.now())
    throw new Error("หมดเวลาชำระแล้ว");
  if (o.status !== "AWAITING_PAYMENT") return;
  o.status = "QUEUED";
  o.paymentStatus = "PAID";
  o.version++;
  if (s.payments[id]) s.payments[id].status = "SUCCEEDED";
  for (const station of new Set(o.items.map((i) => i.station)))
    s.tickets.push({
      id: crypto.randomUUID(),
      orderId: id,
      orderCode: o.code,
      station,
      status: "QUEUED",
      version: 0,
      mode: o.mode,
      createdAt: o.createdAt,
      items: o.items
        .filter((i) => i.station === station)
        .map((i) => ({
          name: i.name,
          quantity: i.quantity,
          note: i.note,
          options: i.options.map((x) => x.label),
        })),
    });
  write(s);
}
export const demoTickets = () => read().tickets;
export function demoTransition(
  id: string,
  target: "PREPARING" | "READY",
  version: number,
) {
  const s = read(),
    t = s.tickets.find((t) => t.id === id);
  if (!t || t.version !== version)
    throw new Error("ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่");
  if (
    (target === "PREPARING" && t.status !== "QUEUED") ||
    (target === "READY" && t.status !== "PREPARING")
  )
    throw new Error("เปลี่ยนสถานะนี้ไม่ได้");
  t.status = target;
  t.version++;
  const o = s.orders.find((o) => o.id === t.orderId)!;
  o.status = s.tickets
    .filter((x) => x.orderId === o.id)
    .every((x) => x.status === "READY")
    ? "READY"
    : "PREPARING";
  o.version++;
  write(s);
}
export function demoComplete(id: string, version: number, code: string) {
  const s = read(),
    o = s.orders.find((o) => o.id === id);
  if (!o || o.version !== version || o.status !== "READY")
    throw new Error("ออเดอร์ยังไม่พร้อมส่งมอบ");
  if (o.mode === "TAKEAWAY" && o.pickupCode !== code)
    throw new Error("รหัสรับอาหารไม่ถูกต้อง");
  o.status = "COMPLETED";
  o.version++;
  write(s);
}
