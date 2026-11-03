"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import {
  money,
  type CartItem,
  type Menu,
  type Mode,
  type Product,
  type Quote,
  type Store,
} from "@/lib/types";
import Link from "next/link";
import { FoodPhoto, StoreIcon, type IconName } from "./storefront-art";
import "./storefront-reference.css";
export default function Storefront() {
  const router = useRouter();
  const [menu, setMenu] = useState<Menu | null>(null),
    [store, setStore] = useState<Store | null>(null);
  const [mode, setMode] = useState<Mode>("TAKEAWAY"),
    [visit, setVisit] = useState<{ id: string; tableCode: string } | null>(
      null,
    );
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]),
    [selected, setSelected] = useState<Product | null>(null);
  const [choices, setChoices] = useState<string[]>([]),
    [quantity, setQuantity] = useState(1),
    [note, setNote] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [checkout, setCheckout] = useState<Quote | null>(null),
    [pickupName, setPickupName] = useState("");
  const [showVisit, setShowVisit] = useState(false),
    [pin, setPin] = useState(""),
    [tableToken, setTableToken] = useState("");
  const orderKey = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .bootstrap()
      .then(() => Promise.all([api.getMenu(), api.getStore()]))
      .then(([m, s]) => {
        if (alive) {
          const saved = localStorage.getItem("yeeyuan-cart");
          if (saved)
            try {
              setCart(JSON.parse(saved));
            } catch {
              localStorage.removeItem("yeeyuan-cart");
            }
          const token = new URLSearchParams(location.search).get("tableToken");
          if (token) {
            setTableToken(token);
            setMode("DINE_IN");
            setShowVisit(true);
          }
          setMenu(m);
          setStore(s);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (menu) localStorage.setItem("yeeyuan-cart", JSON.stringify(cart));
  }, [cart, menu]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (cartOpen) cartDialog.current?.showModal();
    else cartDialog.current?.close();
  }, [cartOpen]);
  const modalOpen = Boolean(selected || cartOpen || showVisit || checkout);
  useEffect(() => {
    if (!modalOpen) return;
    const { scrollX, scrollY } = window;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousScrollBehavior = root.style.scrollBehavior;
    const previousBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    const paddingRight =
      parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    // Keep the page in place, including on mobile, until the last overlay closes.
    root.style.scrollBehavior = "auto";
    root.style.overflow = "hidden";
    Object.assign(body.style, {
      position: "fixed",
      top: `-${scrollY}px`,
      left: `-${scrollX}px`,
      width: "100%",
      overflow: "hidden",
    });
    if (scrollbarWidth)
      body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;
    return () => {
      Object.assign(body.style, previousBodyStyle);
      root.style.overflow = previousRootOverflow;
      window.scrollTo(scrollX, scrollY);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [modalOpen]);
  const itemTotal = (item: CartItem) => {
    const p = menu?.products.find((p) => p.id === item.productId);
    return p
      ? item.quantity *
          (p.priceSatang +
            p.optionGroups
              .flatMap((g) => g.choices)
              .filter((c) => item.optionChoiceIds.includes(c.id))
              .reduce((s, c) => s + c.priceDeltaSatang, 0))
      : 0;
  };
  const subtotal = cart.reduce((s, i) => s + itemTotal(i), 0),
    packaging = mode === "TAKEAWAY" ? (store?.packagingFeeSatang ?? 500) : 0;
  const openProduct = (p: Product) => {
    setChoices(
      p.optionGroups.flatMap((g) =>
        g.minSelect === 1 ? [g.choices.find((c) => c.active)!.id] : [],
      ),
    );
    setQuantity(1);
    setNote("");
    setSelected(p);
    setError("");
  };
  const add = () => {
    if (!selected) return;
    for (const g of selected.optionGroups) {
      const n = g.choices.filter((c) => choices.includes(c.id)).length;
      if (n < g.minSelect || n > g.maxSelect) {
        setError(`กรุณาเลือก ${g.name} ให้ครบ`);
        return;
      }
    }
    setCart((c) => [
      ...c,
      {
        key: crypto.randomUUID(),
        productId: selected.id,
        quantity,
        optionChoiceIds: choices,
        note,
      },
    ]);
    setSelected(null);
  };
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
  const review = () =>
    run(async () => {
      if (!cart.length) return;
      if (mode === "DINE_IN" && !visit) {
        setCartOpen(false);
        setShowVisit(true);
        return;
      }
      const q = await api.quoteCart({
        mode,
        ...(visit && mode === "DINE_IN" ? { visitId: visit.id } : {}),
        items: cart.map(({ key, ...i }) => {
          void key;
          return i;
        }),
      });
      setCheckout(q);
      orderKey.current = crypto.randomUUID();
      setCartOpen(false);
    });
  const submit = () =>
    run(async () => {
      if (!checkout) return;
      if (mode === "TAKEAWAY" && !pickupName.trim())
        throw new Error("กรุณาระบุชื่อรับอาหาร");
      if (!orderKey.current) orderKey.current = crypto.randomUUID();
      const o = await api.createOrder(
        checkout.id,
        pickupName.trim(),
        orderKey.current,
      );
      setCart([]);
      localStorage.removeItem("yeeyuan-cart");
      router.push(`/orders/?id=${o.id}`);
    });
  const visible =
    menu?.products.filter(
      (p) =>
        p.active &&
        (category === "all" || p.categoryId === category) &&
        p.name.includes(search),
    ) ?? [];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const categoryIcon = (name: string): IconName =>
    name.includes("ดื่ม")
      ? "cup"
      : name.includes("เคียง") || name.includes("ทานเล่น")
        ? "plate"
        : "bowl";
  return (
    <div className="reference-storefront" id="home">
      <div className="ref-page">
        <header className="ref-header">
          <Link href="/" className="ref-brand" aria-label="Yee Yuan หน้าแรก">
            <span>
              <StoreIcon name="box" />
            </span>
            YEE YUAN.
          </Link>
          <nav aria-label="เมนูหลัก" className="ref-nav">
            <a href="#home">หน้าแรก</a>
            <a href="#menu">เมนูของเรา</a>
            <a href="#how-it-works">วิธีสั่งอาหาร</a>
            <a href="#contact">ติดต่อร้าน</a>
            <Link href="/orders/">ออเดอร์ของฉัน</Link>
          </nav>
          <div className="ref-header-actions">
            <button
              className="ref-icon-button ref-header-search"
              aria-label="ค้นหาอาหาร"
              onClick={() => {
                document.getElementById("menu-search")?.focus();
              }}
            >
              <StoreIcon name="search" />
            </button>
            <button
              className="ref-icon-button"
              aria-label="เปิดตะกร้า"
              onClick={() => setCartOpen(true)}
            >
              <StoreIcon name="bag" />
              {cartCount > 0 && (
                <span className="ref-cart-count">{cartCount}</span>
              )}
            </button>
            <a className="ref-button ref-header-order" href="#menu">
              สั่งเลย
            </a>
          </div>
        </header>
        {(api.DEMO || store?.paymentMode === "MOCK") && (
          <div className="ref-demo-note">
            โหมดทดสอบ · การชำระเงินจำลอง ไม่มีการตัดเงินจริง
          </div>
        )}
        <main>
          <section className="ref-hero ref-padding">
            <div className="ref-hero-copy">
              <span className="ref-eyebrow">ปรุงสดทุกชาม · ชงใหม่ทุกแก้ว</span>
              <h1>
                อร่อยเต็มชาม
                <br />
                เหมือนกินที่บ้าน.
              </h1>
              <p>
                ก๋วยจั๊บญวนเส้นนุ่ม น้ำซุปหอมกลมกล่อม
                <br className="ref-desktop-break" /> พร้อมเครื่องดื่มแก้วโปรด
                ให้ทุกมื้อเป็นช่วงเวลาดี ๆ
              </p>
              <div className="ref-hero-buttons">
                <a className="ref-button" href="#menu">
                  สั่งอาหารเลย <StoreIcon name="arrow" size={17} />
                </a>
                <a className="ref-button ref-button-outline" href="#categories">
                  ดูเมนูทั้งหมด
                </a>
              </div>
              <div className="ref-facts">
                <div>
                  <b>ปรุงสด</b>
                  <small>หลังรับออเดอร์</small>
                </div>
                <div>
                  <b>2 รูปแบบ</b>
                  <small>ทานที่ร้าน / กลับบ้าน</small>
                </div>
                <div>
                  <b>PromptPay</b>
                  <small>สแกนจ่ายได้เลย</small>
                </div>
              </div>
            </div>
            <div className="ref-hero-visual">
              <FoodPhoto index={0} className="ref-hero-food" />
              <div className="ref-food-sticker">
                <span>
                  <StoreIcon name="box" />
                </span>
                <div>
                  <b>ก๋วยจั๊บญวน</b>
                  <small>ความอร่อยที่คุ้นเคย</small>
                </div>
              </div>
              <div className="ref-fresh-sticker">
                <i />
                ทำใหม่ทุกออเดอร์
              </div>
            </div>
          </section>
          <section className="ref-categories ref-padding" id="categories">
            <div className="ref-section-heading">
              <div>
                <span className="ref-eyebrow">วันนี้อยากทานอะไร?</span>
                <h2>เลือกความอร่อยที่ชอบ</h2>
              </div>
              <a href="#menu" className="ref-text-link">
                ดูเมนูทั้งหมด <StoreIcon name="arrow" size={17} />
              </a>
            </div>
            <div className="ref-category-grid">
              <a
                href="#menu"
                className={`ref-category-card ${category === "all" ? "is-active" : ""}`}
                onClick={() => setCategory("all")}
                aria-current={category === "all" ? "true" : undefined}
              >
                <span>
                  <StoreIcon name="box" size={25} />
                </span>
                <b>ทุกเมนู</b>
                <small>
                  {menu?.products.filter((p) => p.active).length ?? "—"}{" "}
                  เมนูพร้อมให้เลือก
                </small>
              </a>
              {menu?.categories.map((c) => (
                <a
                  href="#menu"
                  key={c.id}
                  className={`ref-category-card ${category === c.id ? "is-active" : ""}`}
                  onClick={() => setCategory(c.id)}
                  aria-current={category === c.id ? "true" : undefined}
                >
                  <span>
                    <StoreIcon name={categoryIcon(c.name)} size={25} />
                  </span>
                  <b>{c.name}</b>
                  <small>
                    {
                      menu.products.filter(
                        (p) => p.active && p.categoryId === c.id,
                      ).length
                    }{" "}
                    เมนูพร้อมให้เลือก
                  </small>
                </a>
              ))}
            </div>
          </section>
          <section className="ref-menu ref-padding" id="menu">
            <div className="ref-section-heading">
              <div>
                <span className="ref-eyebrow">COOKED FRESH · SERVED HOT</span>
                <h2>เมนูของวันนี้</h2>
              </div>
              <span className="ref-store-status">
                <i className={store?.acceptingOrders ? "is-open" : ""} />
                {!store
                  ? "กำลังตรวจสอบร้าน"
                  : store.acceptingOrders
                    ? "เปิดรับออเดอร์"
                    : "พักรับออเดอร์ชั่วคราว"}
              </span>
            </div>
            <div className="ref-menu-tools">
              <div
                className="ref-mode-switch"
                role="group"
                aria-label="รูปแบบรับอาหาร"
              >
                <button
                  className={mode === "TAKEAWAY" ? "is-active" : ""}
                  onClick={() => {
                    setMode("TAKEAWAY");
                    setCheckout(null);
                  }}
                >
                  <StoreIcon name="bag" size={17} />
                  รับกลับบ้าน
                </button>
                <button
                  className={mode === "DINE_IN" ? "is-active" : ""}
                  onClick={() => {
                    setMode("DINE_IN");
                    setCheckout(null);
                    if (!visit) setShowVisit(true);
                  }}
                >
                  <StoreIcon name="bowl" size={17} />
                  {visit ? `โต๊ะ ${visit.tableCode}` : "ทานที่ร้าน"}
                </button>
              </div>
              <label className="ref-search-field">
                <StoreIcon name="search" size={18} />
                <input
                  id="menu-search"
                  aria-label="ค้นหาเมนู"
                  placeholder="ค้นหาเมนูที่อยากทาน…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {(category !== "all" || search) && (
              <div className="ref-filter-state">
                <span>
                  {menu?.categories.find((c) => c.id === category)?.name ??
                    "ทุกเมนู"}{" "}
                  · {visible.length} รายการ
                </span>
                <button
                  onClick={() => {
                    setCategory("all");
                    setSearch("");
                  }}
                >
                  ดูทั้งหมด ×
                </button>
              </div>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            {!menu && !error ? (
              <div className="empty-state">กำลังเตรียมเมนูอร่อย ๆ …</div>
            ) : (
              <div className="ref-product-grid">
                {visible.map((p, i) => (
                  <article className="ref-product-card" key={p.id}>
                    <button
                      className="ref-product-image"
                      aria-label={`เลือก ${p.name}`}
                      disabled={p.soldOut || !store?.acceptingOrders}
                      onClick={() => openProduct(p)}
                    >
                      <FoodPhoto product={p} />
                      {i === 0 && !p.soldOut && (
                        <span className="ref-menu-tag">เมนูแนะนำ</span>
                      )}
                      {p.soldOut && (
                        <span className="ref-menu-tag">หมดชั่วคราว</span>
                      )}
                    </button>
                    <div className="ref-product-content">
                      <div className="ref-product-title">
                        <h3>{p.name}</h3>
                        <strong>{money(p.priceSatang)}</strong>
                      </div>
                      <button
                        className="ref-add-button"
                        aria-label={`เพิ่ม ${p.name}`}
                        disabled={p.soldOut || !store?.acceptingOrders}
                        onClick={() => openProduct(p)}
                      >
                        <span aria-hidden="true">＋</span> เพิ่ม
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {menu && visible.length === 0 && (
              <div className="empty-state">ไม่พบเมนู ลองค้นหาคำอื่นดูนะ</div>
            )}
            <p className="ref-allergen-note">
              แพ้อาหารหรือมีคำขอพิเศษ? ระบุหมายเหตุในเมนูและแจ้งพนักงานก่อนสั่ง
            </p>
          </section>
          <section className="ref-how ref-padding" id="how-it-works">
            <span className="ref-eyebrow">จากเมนูโปรด สู่มื้ออร่อย</span>
            <h2>สั่งง่าย ๆ ใน 4 ขั้นตอน</h2>
            <div className="ref-step-grid">
              {(
                [
                  {
                    icon: "search",
                    title: "เลือกเมนูที่ชอบ",
                    text: "เลือกก๋วยจั๊บญวน ของทานเล่น และเครื่องดื่ม",
                  },
                  {
                    icon: "bag",
                    title: "เพิ่มลงตะกร้า",
                    text: "เลือกตัวเลือกและระบุหมายเหตุได้ตามต้องการ",
                  },
                  {
                    icon: "qr",
                    title: "สแกนจ่ายเงิน",
                    text: "ตรวจรายการ แล้วชำระผ่าน QR PromptPay",
                  },
                  {
                    icon: "box",
                    title: "รอรับความอร่อย",
                    text: "รับที่ร้าน หรือรอเสิร์ฟที่โต๊ะของคุณ",
                  },
                ] as { icon: IconName; title: string; text: string }[]
              ).map((step, i) => (
                <article key={step.title}>
                  <small>0{i + 1}</small>
                  <span className="ref-step-icon">
                    <StoreIcon name={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="ref-care ref-padding">
            <div className="ref-care-image">
              <FoodPhoto index={1} />
            </div>
            <div className="ref-care-copy">
              <span className="ref-eyebrow">ความใส่ใจของ YEE YUAN</span>
              <h2>
                ปรุงด้วยความใส่ใจ
                <br />
                เสิร์ฟความอร่อยให้คุณ.
              </h2>
              <p>
                เส้นนุ่ม น้ำซุปกลมกล่อม และเครื่องดื่มชงใหม่
                <br />
                ความอร่อยเรียบง่ายสำหรับทุกวันของคุณ
              </p>
              <ul>
                <li>
                  <span>
                    <StoreIcon name="check" size={17} />
                  </span>
                  <div>
                    <b>ใส่ใจทุกวัตถุดิบ</b>
                    <small>เตรียมอย่างพิถีพิถันในทุกเมนู</small>
                  </div>
                </li>
                <li>
                  <span>
                    <StoreIcon name="bowl" size={17} />
                  </span>
                  <div>
                    <b>ปรุงหลังรับออเดอร์</b>
                    <small>พร้อมเสิร์ฟร้อน ๆ ในมื้อของคุณ</small>
                  </div>
                </li>
                <li>
                  <span>
                    <StoreIcon name="cup" size={17} />
                  </span>
                  <div>
                    <b>ครบทั้งอาหารและเครื่องดื่ม</b>
                    <small>เลือกมื้อโปรดได้ในออเดอร์เดียว</small>
                  </div>
                </li>
              </ul>
            </div>
          </section>
          <section className="ref-cta ref-padding">
            <div>
              <span className="ref-eyebrow">มื้อนี้ ให้เราดูแล</span>
              <h2>
                ชามโปรดของคุณ
                <br />
                รออยู่ที่นี่.
              </h2>
              <p>
                ทานที่ร้าน หรือรับกลับบ้าน
                <br />
                เลือกเมนูที่ชอบ แล้วเริ่มสั่งได้เลย
              </p>
              <a className="ref-button" href="#menu">
                เลือกเมนูเลย <StoreIcon name="arrow" size={17} />
              </a>
            </div>
            <FoodPhoto index={2} />
          </section>
        </main>
        <footer className="ref-footer ref-padding" id="contact">
          <div>
            <Link href="/" className="ref-brand">
              <span>
                <StoreIcon name="box" />
              </span>
              YEE YUAN.
            </Link>
            <p>ความอร่อยที่คุ้นเคย ในทุกมื้อของคุณ</p>
          </div>
          <nav aria-label="ลิงก์ท้ายหน้า">
            <button
              onClick={() =>
                run(async () => {
                  await api.lineLogin();
                })
              }
            >
              เชื่อมต่อ LINE
            </button>
            <Link href="/orders/">ออเดอร์ของฉัน</Link>
            <Link href="/staff/">สำหรับพนักงาน</Link>
          </nav>
        </footer>
      </div>
      <dialog
        ref={cartDialog}
        className="cart-panel"
        aria-label="ตะกร้าของคุณ"
        onCancel={() => setCartOpen(false)}
        onClick={(event) => {
          if (event.target === cartDialog.current) setCartOpen(false);
        }}
      >
        <div className="cart-heading">
          <h2>
            ตะกร้าของคุณ <span>{cart.reduce((s, c) => s + c.quantity, 0)}</span>
          </h2>
          <button
            className="icon-button mobile-close"
            onClick={() => setCartOpen(false)}
            aria-label="ปิดตะกร้า"
          >
            ×
          </button>
        </div>
        <div className="cart-mode">
          {mode === "TAKEAWAY"
            ? "▢ รับกลับบ้าน"
            : `▦ ทานที่ร้าน ${visit ? `· โต๊ะ ${visit.tableCode}` : ""}`}
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <StoreIcon name="bag" size={42} />
            <h3>มื้อนี้เริ่มที่นี่</h3>
            <p>
              เลือกเมนูที่ชอบ
              <br />
              แล้วเพิ่มลงตะกร้าได้เลย
            </p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => {
                const p = menu?.products.find((p) => p.id === item.productId);
                return (
                  <div className="cart-item" key={item.key}>
                    <div className="cart-line">
                      <strong>{p?.name || "สินค้า"}</strong>
                      <span>{money(itemTotal(item))}</span>
                    </div>
                    <p>
                      {p?.optionGroups
                        .flatMap((g) => g.choices)
                        .filter((c) => item.optionChoiceIds.includes(c.id))
                        .map((c) => c.label)
                        .join(" · ")}
                    </p>
                    {item.note && <small>{item.note}</small>}
                    <div className="cart-controls">
                      <div className="quantity">
                        <button
                          aria-label={`ลด ${p?.name}`}
                          onClick={() =>
                            setCart((c) =>
                              c.flatMap((x) =>
                                x.key !== item.key
                                  ? [x]
                                  : x.quantity > 1
                                    ? [{ ...x, quantity: x.quantity - 1 }]
                                    : [],
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          aria-label={`เพิ่มจำนวน ${p?.name}`}
                          disabled={item.quantity >= 10}
                          onClick={() =>
                            setCart((c) =>
                              c.map((x) =>
                                x.key === item.key
                                  ? { ...x, quantity: x.quantity + 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          ＋
                        </button>
                      </div>
                      <button
                        className="remove-link"
                        onClick={() =>
                          setCart((c) => c.filter((x) => x.key !== item.key))
                        }
                      >
                        นำออก
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="totals">
              <div>
                <span>ค่าอาหารและเครื่องดื่ม</span>
                <span>{money(subtotal)}</span>
              </div>
              <div>
                <span>ค่าบรรจุภัณฑ์</span>
                <span>{packaging ? money(packaging) : "ไม่มี"}</span>
              </div>
              <div className="grand-total">
                <strong>ยอดรวม</strong>
                <strong>{money(subtotal + packaging)}</strong>
              </div>
            </div>
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button checkout-button"
          disabled={!cart.length || busy || !store?.acceptingOrders}
          onClick={review}
        >
          {busy ? "กำลังตรวจรายการ…" : "ตรวจรายการและชำระเงิน"}
          <span>→</span>
        </button>
        <small className="payment-note">
          รับชำระผ่าน PromptPay · ตรวจยอดอัตโนมัติ
        </small>
      </dialog>
      {cartCount > 0 && (
        <button
          className="ref-floating-cart"
          onClick={() => setCartOpen(true)}
          aria-label={`เปิดตะกร้า ${cartCount} รายการ`}
        >
          <span>
            <StoreIcon name="bag" size={18} /> {cartCount} รายการ
          </span>
          <b>ดูตะกร้า · {money(subtotal + packaging)}</b>
          <StoreIcon name="arrow" size={17} />
        </button>
      )}
      <dialog
        ref={dialog}
        className="product-dialog"
        aria-labelledby="product-dialog-title"
        aria-describedby="product-dialog-hint"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            setSelected(null);
        }}
      >
        {selected && (
          <>
            <header className="product-dialog-header">
              <div className="product-dialog-thumbnail">
                <FoodPhoto product={selected} />
              </div>
              <div className="product-dialog-heading">
                <span className="ref-eyebrow">ปรับเมนูตามใจคุณ</span>
                <h2 id="product-dialog-title">{selected.name}</h2>
                <strong>{money(selected.priceSatang)}</strong>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelected(null)}
                aria-label="ปิดตัวเลือกอาหาร"
              >
                ×
              </button>
            </header>
            <div
              className="dialog-content product-dialog-body"
              tabIndex={0}
              role="region"
              aria-label="ตัวเลือกและหมายเหตุอาหาร"
            >
              <p id="product-dialog-hint" className="product-dialog-hint">
                {selected.optionGroups.length
                  ? "เลือกตัวเลือกที่ต้องการ แล้วระบุหมายเหตุเพิ่มเติมได้เลย"
                  : "ระบุหมายเหตุเพิ่มเติม แล้วเลือกจำนวนที่ต้องการได้เลย"}
              </p>
              {selected.optionGroups.map((g) => (
                <fieldset key={g.id}>
                  <legend>
                    {g.name}
                    <small>
                      {g.minSelect
                        ? `เลือก ${g.minSelect} รายการ`
                        : "ไม่บังคับ"}
                    </small>
                  </legend>
                  {g.choices
                    .filter((c) => c.active)
                    .map((c) => (
                      <label className="option-row" key={c.id}>
                        <input
                          type={g.maxSelect === 1 ? "radio" : "checkbox"}
                          name={g.id}
                          checked={choices.includes(c.id)}
                          onChange={(e) =>
                            setChoices((old) =>
                              g.maxSelect === 1
                                ? [
                                    ...old.filter(
                                      (id) =>
                                        !g.choices.some((c) => c.id === id),
                                    ),
                                    c.id,
                                  ]
                                : e.target.checked
                                  ? [...old, c.id]
                                  : old.filter((id) => id !== c.id),
                            )
                          }
                        />
                        <span>{c.label}</span>
                        <small>
                          {c.priceDeltaSatang
                            ? `+${money(c.priceDeltaSatang)}`
                            : ""}
                        </small>
                      </label>
                    ))}
                </fieldset>
              ))}
              <label className="field-label">
                หมายเหตุ
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="เช่น ไม่ใส่ผักชี"
                />
              </label>
              {error && <p className="error-message">{error}</p>}
            </div>
            <footer className="dialog-bottom">
              <div className="product-dialog-quantity">
                <span>จำนวน</span>
                <div className="quantity">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="ลดจำนวน"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="เพิ่มจำนวน"
                    disabled={quantity >= 10}
                  >
                    ＋
                  </button>
                </div>
              </div>
              <button className="primary-button" onClick={add}>
                เพิ่มลงตะกร้า ·{" "}
                {money(
                  quantity *
                    (selected.priceSatang +
                      selected.optionGroups
                        .flatMap((g) => g.choices)
                        .filter((c) => choices.includes(c.id))
                        .reduce(
                          (sum, choice) => sum + choice.priceDeltaSatang,
                          0,
                        )),
                )}
              </button>
            </footer>
          </>
        )}
      </dialog>
      {showVisit && (
        <div className="modal-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-title"
            className="simple-modal"
          >
            <button
              className="modal-close"
              onClick={() => {
                setShowVisit(false);
                if (!visit) setMode("TAKEAWAY");
              }}
              aria-label="ปิด"
            >
              ×
            </button>
            <span className="eyebrow">DINE WITH US</span>
            <h2 id="visit-title">ยินดีต้อนรับที่โต๊ะ</h2>
            <p className="muted">สแกน QR ประจำโต๊ะและใส่รหัสที่พนักงานแจ้ง</p>
            {!tableToken && !api.DEMO && (
              <label className="field-label">
                รหัส QR โต๊ะ
                <input
                  value={tableToken}
                  onChange={(e) => setTableToken(e.target.value)}
                />
              </label>
            )}
            <label className="field-label">
              รหัสรอบโต๊ะ 6 หลัก
              <input
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder={api.DEMO ? "โหมดตัวอย่าง ใส่ 123456" : "••••••"}
              />
            </label>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              disabled={busy || pin.length !== 6}
              onClick={() =>
                run(async () => {
                  const v = await api.joinVisit(tableToken, pin);
                  setVisit(v);
                  setShowVisit(false);
                })
              }
            >
              เข้าร่วมโต๊ะ
            </button>
          </section>
        </div>
      )}
      {checkout && (
        <div className="modal-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="simple-modal"
          >
            <button
              className="modal-close"
              disabled={busy}
              onClick={() => setCheckout(null)}
              aria-label="ปิด"
            >
              ×
            </button>
            <span className="eyebrow">ONE LAST LOOK</span>
            <h2 id="checkout-title">ตรวจรายการก่อนสั่ง</h2>
            {checkout.lines.map((l, i) => (
              <div className="checkout-line" key={i}>
                <span>{l.name}</span>
                <b>{money(l.lineTotalSatang)}</b>
              </div>
            ))}
            <div className="checkout-line">
              <span>ค่าบรรจุภัณฑ์</span>
              <b>{money(checkout.packagingFeeSatang)}</b>
            </div>
            <div className="checkout-line total">
              <strong>รวมสุทธิ</strong>
              <strong>{money(checkout.totalSatang)}</strong>
            </div>
            {mode === "TAKEAWAY" && (
              <label className="field-label">
                ชื่อรับอาหาร
                <input
                  autoComplete="given-name"
                  value={pickupName}
                  maxLength={80}
                  onChange={(e) => setPickupName(e.target.value)}
                  placeholder="ชื่อที่ให้พนักงานเรียก"
                />
              </label>
            )}
            <p className="muted">
              ร้านเริ่มปรุงหลังยืนยันการชำระ เวลารอประมาณ 10–15
              นาทีขึ้นอยู่กับคิว
            </p>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" disabled={busy} onClick={submit}>
              {busy ? "กำลังสร้างออเดอร์…" : "ยืนยันและไปชำระเงิน →"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
