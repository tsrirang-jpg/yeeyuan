"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as api from "@/lib/api";
import { money, statusText, type Order, type Payment } from "@/lib/types";
import { Header } from "./brand";
export default function OrderView() {
  const [list, setList] = useState<Order[]>([]),
    [current, setCurrent] = useState<Order | null>(null),
    [pay, setPay] = useState<Payment | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(0),
    [mock, setMock] = useState(false);
  const id = useRef<string | null>(null),
    paymentKey = useRef<string | null>(null);
  useEffect(() => {
    id.current = new URLSearchParams(location.search).get("id");
    let active = true;
    const refresh = async () => {
      try {
        await api.bootstrap();
        const rows = await api.orders();
        if (!active) return;
        setNow(Date.now());
        setList(rows);
        if (id.current) {
          const o = await api.order(id.current);
          if (active) setCurrent(o);
        }
        const s = await api.getStore();
        if (active) setMock(s.paymentMode === "MOCK");
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
      }
    };
    void refresh();
    const t = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(t);
      clearInterval(clock);
    };
  }, []);
  useEffect(() => {
    if (
      !pay ||
      api.DEMO ||
      !["PENDING", "CREATING", "UNKNOWN"].includes(pay.status)
    )
      return;
    let active = true;
    const t = setInterval(() => {
      if (document.hidden) return;
      api
        .getPayment(pay.id)
        .then((p) => {
          if (active) setPay(p);
        })
        .catch(() => {});
    }, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [pay]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };
  const seconds = current
    ? Math.max(0, Math.ceil((Date.parse(current.paymentDeadline) - now) / 1000))
    : 0;
  const steps = ["QUEUED", "PREPARING", "READY", "COMPLETED"],
    step = current ? steps.indexOf(current.status) : -1;
  return (
    <>
      <Header active="orders" />
      <main className="page-shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR LITTLE MOMENT</span>
            <h1>ออเดอร์ของคุณ</h1>
          </div>
          <Link href="/" className="text-link">
            สั่งเพิ่ม ↗
          </Link>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {current ? (
          <div className="tracking-layout">
            <section className="tracking-card">
              <div className="tracking-top">
                <span className="eyebrow">{current.code}</span>
                <span className="status-badge">
                  {statusText[current.status]}
                </span>
              </div>
              <h2>
                {current.status === "READY"
                  ? "มื้ออร่อยพร้อมแล้ว!"
                  : current.status === "AWAITING_PAYMENT"
                    ? "อีกนิดเดียว ก็ได้อร่อย"
                    : current.status === "COMPLETED"
                      ? "ขอบคุณที่ให้เราดูแลมื้อนี้"
                      : "เรากำลังดูแลมื้อของคุณ"}
              </h2>
              <p className="muted">
                {current.mode === "TAKEAWAY"
                  ? `รับกลับบ้าน · ${current.pickupName}`
                  : "ทานที่ร้าน"}
              </p>
              {current.status !== "AWAITING_PAYMENT" && step >= 0 && (
                <div className="tracking-steps">
                  {steps.map((s, i) => (
                    <div className={i <= step ? "done" : ""} key={s}>
                      <span>{i < step ? "✓" : i + 1}</span>
                      <small>{statusText[s as Order["status"]]}</small>
                    </div>
                  ))}
                </div>
              )}
              {current.pickupCode &&
                current.paymentStatus === "PAID" &&
                current.mode === "TAKEAWAY" && (
                  <div className="pickup-code">
                    <small>แจ้งรหัสนี้กับพนักงานตอนรับอาหาร</small>
                    <b>{current.pickupCode}</b>
                  </div>
                )}
              {current.status === "AWAITING_PAYMENT" && (
                <div className="payment-box">
                  <div className="checkout-line">
                    <span>ยอดชำระ</span>
                    <strong>{money(current.totalSatang)}</strong>
                  </div>
                  {seconds > 0 ? (
                    <p className="muted">
                      ชำระภายใน {Math.floor(seconds / 60)}:
                      {String(seconds % 60).padStart(2, "0")} นาที
                    </p>
                  ) : (
                    <p className="error-message">
                      หมดเวลาบนหน้าจอ กำลังรอระบบตรวจผล กรุณาอย่าจ่ายซ้ำ
                    </p>
                  )}
                  {!pay ? (
                    <button
                      className="primary-button"
                      disabled={busy || !seconds}
                      onClick={() =>
                        run(async () => {
                          paymentKey.current ??= crypto.randomUUID();
                          setPay(
                            await api.payment(current.id, paymentKey.current),
                          );
                        })
                      }
                    >
                      {busy ? "กำลังเตรียมการชำระ…" : "สร้าง QR PromptPay"}
                    </button>
                  ) : pay.demo || api.DEMO ? (
                    <div className="mock-payment">
                      <div className="demo-qr">
                        การชำระเงิน
                        <br />
                        <b>โหมดทดลอง</b>
                        <small>ไม่มี QR รับเงินจริง</small>
                      </div>
                      <button
                        className="primary-button"
                        disabled={busy || !seconds}
                        onClick={() =>
                          run(async () => {
                            await api.simulate(current.id);
                            setCurrent(await api.order(current.id));
                          })
                        }
                      >
                        จำลองจ่ายสำเร็จ
                      </button>
                    </div>
                  ) : pay.qrUrl ? (
                    <>
                      <div className="real-qr">
                        <Image
                          unoptimized
                          src={pay.qrUrl}
                          alt="QR PromptPay สำหรับออเดอร์นี้"
                          width={240}
                          height={240}
                        />
                      </div>
                      <a
                        className="text-link"
                        href={pay.qrUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        เปิดรูป QR เพื่อบันทึก ↗
                      </a>
                      <p className="muted">
                        ใช้แอปธนาคารสแกนหรือเลือกรูป QR ระบบตรวจชำระอัตโนมัติ
                        ไม่ต้องส่งสลิป
                      </p>
                    </>
                  ) : (
                    <p role="status">
                      กำลังตรวจสอบกับผู้ให้บริการ กรุณาอย่าสร้างรายการจ่ายซ้ำ
                    </p>
                  )}
                  {mock && !api.DEMO && (
                    <p className="demo-banner">
                      API ทำงานในโหมด MOCK ไม่มีรับเงินจริง
                    </p>
                  )}
                </div>
              )}
              {current.status === "ON_HOLD" && (
                <p className="error-message">
                  ร้านกำลังตรวจสอบรายการนี้
                  กรุณาติดต่อพนักงานพร้อมแจ้งหมายเลขออเดอร์
                </p>
              )}
            </section>
            <aside className="tracking-card order-summary">
              <h3>รายการของคุณ</h3>
              {current.items.map((i) => (
                <div className="summary-item" key={i.id}>
                  <div className="checkout-line">
                    <strong>
                      {i.quantity} × {i.name}
                    </strong>
                    <span>{money(i.lineTotalSatang)}</span>
                  </div>
                  <small>{i.options.map((o) => o.label).join(" · ")}</small>
                  {i.note && <p className="muted">หมายเหตุ: {i.note}</p>}
                </div>
              ))}
              <div className="totals">
                <div>
                  <span>ค่าบรรจุภัณฑ์</span>
                  <span>{money(current.packagingFeeSatang)}</span>
                </div>
                <div className="grand-total">
                  <strong>ยอดรวม</strong>
                  <strong>{money(current.totalSatang)}</strong>
                </div>
              </div>
              <p className="payment-note">
                {current.paymentStatus === "PAID"
                  ? "✓ ยืนยันรับชำระแล้ว"
                  : "ยังไม่มีการยืนยันรับชำระ"}
              </p>
              <button className="text-button" onClick={() => window.print()}>
                พิมพ์รายการ / ใบรับเงิน
              </button>
            </aside>
          </div>
        ) : list.length ? (
          <div className="order-list">
            {list.map((o) => (
              <Link
                href={`/orders/?id=${o.id}`}
                key={o.id}
                onClick={() => {
                  id.current = o.id;
                  setCurrent(o);
                  setPay(null);
                  paymentKey.current = null;
                }}
                className="order-list-card"
              >
                <span>
                  <b>{o.code}</b>
                  <small>{new Date(o.createdAt).toLocaleString("th-TH")}</small>
                </span>
                <span className="status-badge">{statusText[o.status]}</span>
                <strong>{money(o.totalSatang)}</strong>
                <span>→</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>ยังไม่มีออเดอร์</h2>
            <p>เริ่มมื้ออร่อยของคุณได้จากหน้าร้าน</p>
            <Link href="/" className="primary-button">
              ไปเลือกเมนู
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
