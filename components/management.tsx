"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import * as api from "@/lib/api";
import {
  money,
  type Menu,
  type Order,
  type Product,
  type Store,
} from "@/lib/types";
type Table = { id: string; code: string; visit_id: string | null };
type Refund = {
  id: string;
  amount_satang: number;
  status: string;
  reason: string;
  version: number;
};
export default function Management({
  orders,
  onChange,
}: {
  orders: Order[];
  onChange: () => Promise<void>;
}) {
  const [menu, setMenu] = useState<Menu | null>(null),
    [store, setStore] = useState<Store | null>(null),
    [tables, setTables] = useState<Table[]>([]),
    [refunds, setRefunds] = useState<Refund[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [qr, setQr] = useState<{ url: string; image: string } | null>(null),
    [received, setReceived] = useState<number | null>(null);
  const load = async () => {
    if (api.DEMO) return;
    const [m, s, t, r] = await Promise.all([
      api.getMenu(),
      api.getStore(),
      api.request<{ items: Table[] }>("/staff/tables"),
      api.request<{ items: Refund[] }>("/staff/refunds"),
    ]);
    setMenu(m);
    setStore(s);
    setTables(t.items);
    setRefunds(r.items);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const report = await api.request<{ receivedSatang: number }>(
      `/staff/reports/daily?date=${date}`,
    );
    setReceived(report.receivedSatang);
  };
  useEffect(() => {
    void Promise.resolve().then(load).catch((e) => setError(e.message));
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const toggle = (p: Product) =>
    run(async () => {
      await api.request(`/staff/products/${p.id}`, "PUT", {
        version: p.version,
        name: p.name,
        priceSatang: p.priceSatang,
        active: p.active,
        soldOut: !p.soldOut,
      });
    });
  if (api.DEMO)
    return (
      <section className="tracking-card">
        <h2>จัดการร้าน</h2>
        <p>
          โหมดตัวอย่างใช้โต๊ะ 05 และรหัส 123456 หากต้องการจัดการโต๊ะ เมนู
          และคืนเงินจากฐานข้อมูล ให้ใช้โหมดเชื่อม backend ตามคู่มือ README
        </p>
      </section>
    );
  return (
    <div className="management-grid">
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice-message" role="status">
          {notice}
        </p>
      )}
      <section className="tracking-card">
        <div className="section-heading">
          <h2>การรับออเดอร์</h2>
          <button
            className="small-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api.request("/staff/store/availability", "PUT", {
                  acceptingOrders: !store?.acceptingOrders,
                  reason: "เปลี่ยนผ่านหลังร้าน",
                });
              })
            }
          >
            {store?.acceptingOrders ? "พักรับออเดอร์" : "เปิดรับออเดอร์"}
          </button>
        </div>
        <p className="muted">
          {store?.acceptingOrders
            ? "ร้านกำลังรับออเดอร์ใหม่"
            : "ร้านพักรับออเดอร์ใหม่"}{" "}
          · ออเดอร์ที่จ่ายแล้วทำต่อได้
        </p>
        <div className="checkout-line">
          <span>ยอดรับชำระวันนี้ตามเวลาประเทศไทย</span>
          <strong>{received === null ? "…" : money(received)}</strong>
        </div>
      </section>
      <section className="tracking-card">
        <h2>โต๊ะและรอบลูกค้า</h2>
        <p className="muted">เปิดรอบโต๊ะก่อน แล้วให้ลูกค้าสแกน QR ประจำโต๊ะเพื่อระบุโต๊ะและเริ่มสั่งอาหาร</p>
        <div className="table-cards">
          {tables.map((t) => (
            <div className="table-card" key={t.id}>
              <b>โต๊ะ {t.code}</b>
              <span className="muted">
                {t.visit_id ? "ปิดรอบ" : "เปิดรอบโต๊ะ"}
              </span>
              <div className="table-actions">
                <button
                  disabled={busy}
                  className="small-button"
                  onClick={() =>
                    run(async () => {
                      if (t.visit_id) {
                        await api.request(
                          `/staff/table-visits/${t.visit_id}/close`,
                          "POST",
                          {},
                        );
                      } else {
                        const result = await api.request<{ pin: string }>(
                          "/staff/table-visits",
                          "POST",
                          { tableId: t.id },
                        );
                        setNotice(`โต๊ะ ${t.code} เปิดรอบแล้ว · ลูกค้าสแกน QR เพื่อสั่งอาหาร (PIN สำรอง ${result.pin})`);
                      }
                    })
                  }
                >
                  {t.visit_id ? "ปิดรอบ" : "เปิดรอบ / รับ PIN"}
                </button>
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() =>
                    run(async () => {
                      const result = await api.request<{ url: string }>(
                        `/staff/tables/${t.id}/rotate-qr`,
                        "POST",
                        {},
                      );
                      const generator = await import("qrcode");
                      setQr({
                        url: result.url,
                        image: await generator.toDataURL(result.url, {
                          width: 360,
                          margin: 3,
                          errorCorrectionLevel: "M",
                        }),
                      });
                      setNotice(
                        "สร้าง QR ใหม่แล้ว QR เดิมของโต๊ะนี้ใช้ไม่ได้ กรุณาพิมพ์ติดโต๊ะใหม่",
                      );
                    })
                  }
                >
                  สร้าง QR ใหม่
                </button>
              </div>
            </div>
          ))}
        </div>
        {qr && (
          <div className="table-qr">
            <Image
              unoptimized
              src={qr.image}
              width={260}
              height={260}
              alt="QR ประจำโต๊ะ"
            />
            <a
              href={qr.image}
              download="yeeyuan-table-qr.png"
              className="text-link"
            >
              บันทึก QR
            </a>
            <a
              href={qr.url}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              เปิดหน้าสั่งของโต๊ะ ↗
            </a>
          </div>
        )}
      </section>
      <section className="tracking-card">
        <h2>เมนูและจำนวนขายได้</h2>
        <div className="manage-products">
          {menu?.products.map((p) => (
            <div className="manage-product" key={p.id}>
              <div>
                <b>{p.name}</b>
                <small className="muted">
                  {money(p.priceSatang)} ·{" "}
                  {p.soldOut ? "หมดชั่วคราว" : "เปิดขาย"}
                </small>
              </div>
              <div className="table-actions">
                <button
                  disabled={busy}
                  className="small-button"
                  onClick={() => toggle(p)}
                >
                  {p.soldOut ? "เปิดขาย" : "ของหมด"}
                </button>
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() => {
                    const input = prompt(
                      "ราคาขายใหม่เป็นบาท",
                      String(p.priceSatang / 100),
                    );
                    if (input === null) return;
                    const price = Math.round(Number(input) * 100);
                    if (!Number.isFinite(price) || price < 0) {
                      setError("ราคาไม่ถูกต้อง");
                      return;
                    }
                    void run(async () => {
                      await api.request(`/staff/products/${p.id}`, "PUT", {
                        version: p.version,
                        name: p.name,
                        priceSatang: price,
                        active: p.active,
                        soldOut: p.soldOut,
                      });
                    });
                  }}
                >
                  แก้ราคา
                </button>
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() =>
                    run(async () => {
                      const stock = await api.request<{
                        version: number;
                        availableQty: number | null;
                      }>(`/staff/products/${p.id}/stock`);
                      const input = prompt(
                        "จำนวนที่ยังขายได้ (เว้นว่าง = ไม่จำกัด)",
                        stock.availableQty === null
                          ? ""
                          : String(stock.availableQty),
                      );
                      if (input === null) return;
                      const qty = input.trim() === "" ? null : Number(input);
                      if (qty !== null && (!Number.isInteger(qty) || qty < 0))
                        throw new Error("จำนวนต้องเป็นจำนวนเต็มไม่ติดลบ");
                      await api.request(
                        `/staff/products/${p.id}/stock`,
                        "PUT",
                        { version: stock.version, availableQty: qty },
                      );
                    })
                  }
                >
                  จำนวนขายได้
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="tracking-card">
        <h2>การคืนเงิน</h2>
        <p className="muted">
          เปิดคำขอและอนุมัติในระบบ จากนั้นโอนคืนผ่านธนาคารและบันทึกหลักฐาน
          ระบบนี้ไม่โอนคืนให้อัตโนมัติ
        </p>
        <div className="manage-products">
          {orders
            .filter(
              (o) =>
                o.paymentStatus === "PAID" &&
                o.paymentAttempts?.some((p) => p.status === "SUCCEEDED"),
            )
            .map((o) => (
              <div className="manage-product" key={o.id}>
                <div>
                  <b>{o.code}</b>
                  <small>{money(o.totalSatang)}</small>
                </div>
                <button
                  className="small-button"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt("เหตุผลขอคืนเงินเต็มจำนวน");
                    if (!reason?.trim()) return;
                    void run(async () => {
                      const attempt = o.paymentAttempts!.find(
                        (p) => p.status === "SUCCEEDED",
                      )!;
                      await api.request(
                        "/staff/refunds",
                        "POST",
                        {
                          attemptId: attempt.id,
                          amountSatang: o.totalSatang,
                          reason,
                        },
                        crypto.randomUUID(),
                      );
                      setNotice("สร้างคำขอคืนเงินแล้ว ยังไม่ได้โอนเงินจริง");
                    });
                  }}
                >
                  ขอคืนเงิน
                </button>
              </div>
            ))}
        </div>
        {refunds.map((r) => (
          <div className="manage-product" key={r.id}>
            <div>
              <b>
                {money(r.amount_satang)} · {r.status}
              </b>
              <small>{r.reason}</small>
            </div>
            {r.status === "REQUESTED" && (
              <button
                disabled={busy}
                className="small-button"
                onClick={() =>
                  run(async () => {
                    await api.request(
                      `/staff/refunds/${r.id}/approve`,
                      "POST",
                      { version: r.version },
                    );
                  })
                }
              >
                อนุมัติ
              </button>
            )}
            {r.status === "APPROVED" && (
              <button
                disabled={busy}
                className="small-button"
                onClick={() => {
                  const bankReference = prompt(
                    "โอนคืนผ่านธนาคารแล้วเท่านั้น: ใส่เลขอ้างอิงธนาคาร",
                  );
                  if (!bankReference) return;
                  const evidenceRef = prompt(
                    "ตำแหน่งหลักฐานในที่เก็บส่วนตัวของร้าน",
                  );
                  if (!evidenceRef) return;
                  void run(async () => {
                    await api.request(
                      `/staff/refunds/${r.id}/confirm-paid`,
                      "POST",
                      { version: r.version, bankReference, evidenceRef },
                      crypto.randomUUID(),
                    );
                    setNotice("บันทึกว่าโอนคืนแล้วพร้อมหลักฐาน");
                  });
                }}
              >
                ยืนยันว่าโอนคืนแล้ว
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

