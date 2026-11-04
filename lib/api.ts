import { demoMenu } from "./catalog";
import * as demo from "./demo";
import type {
  Menu,
  Order,
  Payment,
  Quote,
  QuoteRequest,
  Store,
  Ticket,
} from "./types";
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const configuredBase =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
const BASE = (() => {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return configuredBase;
  }
  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return configuredBase;
  }
  // Keep the API cookie same-site when the dev server is opened via localhost
  // or 127.0.0.1; browsers treat those hostnames as different sites.
  const apiUrl = new URL(configuredBase);
  apiUrl.hostname = hostname;
  return apiUrl.toString().replace(/\/$/, "");
})();
let csrf = "";
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  idem?: string,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      ...(idem ? { "Idempotency-Key": idem } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "ติดต่อระบบไม่ได้ กรุณาลองใหม่");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
let initialized: Promise<void> | undefined;
export async function bootstrap() {
  if (DEMO) return;
  return (initialized ??= initialize().catch((e) => {
    initialized = undefined;
    throw e;
  }));
}
async function initialize() {
  const token = await request<{ csrfToken: string }>("/auth/csrf");
  csrf = token.csrfToken;
  const me = await request<{ kind: string }>("/me").catch(() => null);
  if (!me) {
    const auth = await request<{ csrfToken: string }>(
      "/auth/guest",
      "POST",
      {},
    );
    csrf = auth.csrfToken;
  }
}
export const getMenu = (): Promise<Menu> =>
  DEMO ? Promise.resolve(demoMenu) : request("/menu");
export const getStore = (): Promise<Store> =>
  DEMO
    ? Promise.resolve({
        name: "Yee Yuan",
        acceptingOrders: true,
        packagingFeeSatang: 500,
        paymentMode: "MOCK",
      })
    : request("/store");
export const quoteCart = (r: QuoteRequest): Promise<Quote> =>
  DEMO ? Promise.resolve(demo.demoQuote(r)) : request("/quotes", "POST", r);
export const createOrder = (
  id: string,
  name: string,
  key: string,
): Promise<Order> =>
  DEMO
    ? Promise.resolve(demo.demoCreate(id, name, key))
    : request("/orders", "POST", { quoteId: id, pickupName: name }, key);
export const orders = async (): Promise<Order[]> =>
  DEMO
    ? demo.demoOrders()
    : (await request<{ items: Order[] }>("/orders")).items;
export const order = async (id: string): Promise<Order> => {
  if (!DEMO) return request(`/orders/${id}`);
  const o = demo.demoOrders().find((o) => o.id === id);
  if (!o) throw new Error("ไม่พบออเดอร์");
  return o;
};
export const payment = (id: string, key: string): Promise<Payment> =>
  DEMO
    ? Promise.resolve(demo.demoPayment(id))
    : request(
        `/orders/${id}/payment-attempts`,
        "POST",
        { method: "PROMPTPAY" },
        key,
      );
export const getPayment = (id: string): Promise<Payment> =>
  request(`/payment-attempts/${id}`);
export const simulate = async (id: string) => {
  if (DEMO) return demo.demoPay(id);
  await request(`/orders/${id}/simulate-payment`, "POST", {});
};
export const joinVisit = (
  qrToken: string,
  pin: string,
): Promise<{ id: string; tableCode: string }> =>
  DEMO
    ? Promise.resolve({ id: "demo-visit", tableCode: "05" })
    : request("/table-visits/join", "POST", { qrToken, pin });
export const scanTable = (
  qrToken: string,
): Promise<{ id: string; tableCode: string; expiresAt: string }> =>
  DEMO
    ? Promise.resolve({
        id: "demo-visit",
        tableCode: "05",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    : request("/table-visits/scan", "POST", { qrToken });
export const staffLogin = async (
  username: string,
  password: string,
  totp: string,
) => {
  if (DEMO) return;
  const token = await request<{ csrfToken: string }>("/auth/csrf");
  csrf = token.csrfToken;
  const result = await request<{ csrfToken: string }>("/auth/staff", "POST", {
    username,
    password,
    totp,
  });
  csrf = result.csrfToken;
};
export const staffOrders = async (): Promise<Order[]> =>
  DEMO
    ? demo.demoOrders().map((o) => ({ ...o, pickupCode: undefined }))
    : (await request<{ items: Order[] }>("/staff/orders")).items;
export const tickets = async (): Promise<Ticket[]> =>
  DEMO
    ? demo.demoTickets()
    : (await request<{ items: Ticket[] }>("/staff/kitchen-tickets")).items;
export const transition = async (
  id: string,
  targetStatus: "PREPARING" | "READY",
  version: number,
) => {
  if (DEMO) return demo.demoTransition(id, targetStatus, version);
  await request(`/staff/kitchen-tickets/${id}/transition`, "POST", {
    targetStatus,
    version,
  });
};
export const complete = async (
  id: string,
  version: number,
  pickupCode: string,
) => {
  if (DEMO) return demo.demoComplete(id, version, pickupCode);
  await request(`/staff/orders/${id}/complete`, "POST", {
    version,
    pickupCode,
  });
};
export async function lineLogin() {
  if (DEMO)
    throw new Error("เชื่อม LINE ได้เมื่อปิดโหมดตัวอย่างและตั้งค่า LIFF แล้ว");
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) throw new Error("ร้านยังไม่ได้ตั้งค่า LINE LIFF");
  const liff = await (await import("./liff")).loadLiff();
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return;
  }
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error("ไม่พบ LINE ID token กรุณาตรวจ scope openid");
  const result = await request<{ csrfToken: string }>("/auth/line", "POST", {
    idToken,
  });
  csrf = result.csrfToken;
}
