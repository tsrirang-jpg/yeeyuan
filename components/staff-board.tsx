"use client";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { money, statusText, type Order, type Ticket } from "@/lib/types";
import { Header } from "./brand";
import Management from "./management";
export default function StaffBoard() {
  const [logged, setLogged] = useState(api.DEMO),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [totp, setTotp] = useState("");
  const [orders, setOrders] = useState<Order[]>([]),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [station, setStation] = useState("ALL"),
    [tab, setTab] = useState("kitchen"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [synced, setSynced] = useState("");
  const refresh = async () => {
    const [o, t] = await Promise.all([api.staffOrders(), api.tickets()]);
    setOrders(o);
    setTickets(t);
    setSynced(new Date().toLocaleTimeString("th-TH"));
  };
  useEffect(() => {
    if (!logged) return;
    let alive = true;
    const load = () =>
      refresh().catch((e) => {
        if (alive) setError(e.message);
      });
    void load();
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [logged]);
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
  return (
    <>
      <Header active="staff" />
      <main className="page-shell wide">
        {!logged ? (
          <section className="login-card">
            <span className="eyebrow">YEE YUAN TEAM</span>
            <h1>ยินดีต้อนรับกลับ</h1>
            <p className="muted">เข้าสู่ระบบเพื่อจัดการร้านและคิวอาหาร</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api.staffLogin(username, password, totp);
                  setLogged(true);
                });
              }}
            >
              <label className="field-label">
                ชื่อผู้ใช้
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label className="field-label">
                รหัสผ่าน
                <input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <label className="field-label">
                รหัสยืนยัน 6 หลัก (เมื่อเปิด MFA)
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  maxLength={6}
                />
              </label>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" disabled={busy}>
                เข้าสู่หลังร้าน
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">TODAY AT YEE YUAN</span>
                <h1>จัดการมื้ออร่อย</h1>
              </div>
              <span className="muted">อัปเดตล่าสุด {synced || "…"}</span>
            </div>
            <div className="stat-grid">
              <div>
                <small>ออเดอร์รอทำ</small>
                <b>{orders.filter((o) => o.status === "QUEUED").length}</b>
              </div>
              <div>
                <small>กำลังปรุง</small>
                <b>{orders.filter((o) => o.status === "PREPARING").length}</b>
              </div>
              <div>
                <small>พร้อมส่งมอบ</small>
                <b>{orders.filter((o) => o.status === "READY").length}</b>
              </div>
              <div>
                <small>รับชำระในรายการที่โหลด</small>
                <b>
                  {money(
                    orders
                      .filter((o) => o.paymentStatus === "PAID")
                      .reduce((s, o) => s + o.totalSatang, 0),
                  )}
                </b>
              </div>
            </div>
            <div className="staff-toolbar">
              <div className="category-tabs">
                <button
                  className={tab === "kitchen" ? "active" : ""}
                  onClick={() => setTab("kitchen")}
                >
                  คิวครัว
                </button>
                <button
                  className={tab === "orders" ? "active" : ""}
                  onClick={() => setTab("orders")}
                >
                  ออเดอร์ทั้งหมด
                </button>
                <button
                  className={tab === "manage" ? "active" : ""}
                  onClick={() => setTab("manage")}
                >
                  จัดการร้าน
                </button>
              </div>
              <select
                aria-label="สถานีครัว"
                value={station}
                onChange={(e) => setStation(e.target.value)}
              >
                <option value="ALL">ทุกสถานี</option>
                <option value="FOOD">อาหาร</option>
                <option value="DRINK">เครื่องดื่ม</option>
              </select>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {tab === "manage" ? (
              <Management orders={orders} onChange={refresh} />
            ) : tab === "kitchen" ? (
              <div className="kanban">
                {(["QUEUED", "PREPARING", "READY"] as const).map((status) => (
                  <section className="kanban-column" key={status}>
                    <h2>
                      <i className={`queue-dot ${status.toLowerCase()}`} />
                      {status === "QUEUED"
                        ? "รอทำ"
                        : status === "PREPARING"
                          ? "กำลังทำ"
                          : "พร้อมส่งมอบ"}
                      <span>
                        {
                          tickets.filter(
                            (t) =>
                              t.status === status &&
                              (station === "ALL" || t.station === station),
                          ).length
                        }
                      </span>
                    </h2>
                    {tickets
                      .filter(
                        (t) =>
                          t.status === status &&
                          (station === "ALL" || t.station === station),
                      )
                      .map((t) => (
                        <article className="ticket" key={t.id}>
                          <div className="cart-line">
                            <b>{t.orderCode}</b>
                            <span className="ticket-station">
                              {t.station === "FOOD" ? "อาหาร" : "เครื่องดื่ม"}
                            </span>
                          </div>
                          <small className="muted">
                            {t.mode === "TAKEAWAY"
                              ? "รับกลับบ้าน"
                              : "ทานที่ร้าน"}{" "}
                            ·{" "}
                            {new Date(t.createdAt).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                          <div className="ticket-items">
                            {t.items.map((i, n) => (
                              <div key={n}>
                                <b>
                                  {i.quantity} × {i.name}
                                </b>
                                <small>{i.options.join(" · ")}</small>
                                {i.note && (
                                  <p className="ticket-note">{i.note}</p>
                                )}
                              </div>
                            ))}
                          </div>
                          {status !== "READY" && (
                            <button
                              className="primary-button"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  await api.transition(
                                    t.id,
                                    status === "QUEUED" ? "PREPARING" : "READY",
                                    t.version,
                                  );
                                  await refresh();
                                })
                              }
                            >
                              {status === "QUEUED"
                                ? "เริ่มทำอาหาร"
                                : "พร้อมแล้ว ✓"}
                            </button>
                          )}
                          {status === "READY" && (
                            <p className="payment-note">
                              รอทุกสถานีพร้อมแล้วส่งมอบที่แท็บออเดอร์
                            </p>
                          )}
                        </article>
                      ))}
                  </section>
                ))}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>ออเดอร์</th>
                      <th>รับอาหาร</th>
                      <th>รายการ</th>
                      <th>ยอด</th>
                      <th>สถานะ</th>
                      <th>ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <b>{o.code}</b>
                        </td>
                        <td>
                          {o.mode === "TAKEAWAY" ? o.pickupName : "ที่โต๊ะ"}
                        </td>
                        <td>
                          {o.items.reduce((s, i) => s + i.quantity, 0)} รายการ
                        </td>
                        <td>{money(o.totalSatang)}</td>
                        <td>
                          <span className="status-badge">
                            {statusText[o.status]}
                          </span>
                        </td>
                        <td>
                          {o.status === "READY" && (
                            <button
                              className="small-button"
                              disabled={busy}
                              onClick={() => {
                                const code =
                                  o.mode === "TAKEAWAY"
                                    ? prompt("รหัสรับอาหาร 6 หลักที่ลูกค้าแสดง")
                                    : "";
                                if (code === null) return;
                                void run(async () => {
                                  await api.complete(o.id, o.version, code);
                                  await refresh();
                                });
                              }}
                            >
                              ส่งมอบ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
