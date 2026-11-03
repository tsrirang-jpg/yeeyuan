"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO, getStore } from "@/lib/api";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${small ? "small" : ""}`}
      aria-label="Yee Yuan หน้าสั่งอาหาร"
    >
      <span className="brand-mark">
        ยี<span>ญ</span>
      </span>
      <span>
        <b>
          YEE YUAN<span className="brand-dot">.</span>
        </b>
        <small>ยี่หยวน · ก๋วยจั๊บญวน</small>
      </span>
    </Link>
  );
}
export function Header({
  active = "menu",
}: {
  active?: "menu" | "orders" | "staff";
}) {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    if (!DEMO)
      void getStore()
        .then((s) => setMock(s.paymentMode === "MOCK"))
        .catch(() => {});
  }, []);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="เมนูหลัก">
            <Link className={active === "menu" ? "active" : ""} href="/">
              สั่งอาหาร
            </Link>
            <Link
              className={active === "orders" ? "active" : ""}
              href="/orders/"
            >
              ออเดอร์ของฉัน
            </Link>
            <Link
              className={`staff-link ${active === "staff" ? "active" : ""}`}
              href="/staff/"
            >
              หลังร้าน ↗
            </Link>
          </nav>
        </div>
      </header>
      {(DEMO || mock) && (
        <div className="demo-banner">
          {DEMO
            ? "โหมดตัวอย่าง · ข้อมูลอยู่ในเบราว์เซอร์นี้ · ไม่มีการรับชำระเงินจริง"
            : "โหมดทดสอบการชำระ · เชื่อมฐานข้อมูลแล้ว · ยังไม่มีการรับเงินจริง"}
        </div>
      )}
    </>
  );
}
export function Bowl({
  drink = false,
  variant = "original",
}: {
  drink?: boolean;
  variant?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 290"
      role="img"
      aria-label={drink ? "ภาพประกอบเครื่องดื่ม" : "ภาพประกอบก๋วยจั๊บญวน"}
      className="food-illustration"
    >
      <ellipse
        cx="203"
        cy="253"
        rx="136"
        ry="17"
        fill="#153e2d"
        opacity=".08"
      />
      {drink ? (
        <>
          <path
            d="M130 72H270L252 242Q200 258 148 242Z"
            fill={
              variant === "lime"
                ? "#a06b29"
                : variant === "water"
                  ? "#a3c7c8"
                  : "#c97835"
            }
          />
          <path d="M135 112H265L261 144H139Z" fill="#f6deac" opacity=".55" />
          <rect x="124" y="64" width="152" height="14" rx="7" fill="#fffcf0" />
          <path d="M227 17L212 193" stroke="#355c43" strokeWidth="10" />
          <rect
            x="150"
            y="93"
            width="35"
            height="32"
            rx="6"
            fill="white"
            opacity=".32"
            transform="rotate(16 167 110)"
          />
          <rect
            x="204"
            y="133"
            width="31"
            height="28"
            rx="5"
            fill="white"
            opacity=".25"
            transform="rotate(-15 220 147)"
          />
          <path
            d="M168 213Q198 225 236 210"
            fill="none"
            stroke="#fff3d0"
            strokeWidth="2"
            opacity=".5"
          />
        </>
      ) : (
        <>
          <path d="M64 139Q78 246 200 253Q322 246 336 139Z" fill="#faf2df" />
          <path
            d="M81 172Q99 239 199 246Q301 239 319 172"
            fill="none"
            stroke="#e2d8c2"
            strokeWidth="3"
          />
          <ellipse cx="200" cy="139" rx="137" ry="56" fill="#fffbeb" />
          <ellipse cx="200" cy="139" rx="122" ry="45" fill="#b9793e" />
          <ellipse cx="200" cy="143" rx="111" ry="36" fill="#d5a161" />
          <g fill="none" stroke="#fff0c3" strokeWidth="8" strokeLinecap="round">
            <path d="M110 130Q145 104 176 135T240 131T289 145" />
            <path d="M111 147Q148 124 181 151T246 147" />
            <path d="M150 161Q176 137 202 162T258 160" />
          </g>
          <g fill="#e4b1a0" stroke="#b78a77" strokeWidth="2">
            <ellipse
              cx="153"
              cy="112"
              rx="26"
              ry="16"
              transform="rotate(-15 153 112)"
            />
            <ellipse
              cx="249"
              cy="121"
              rx="26"
              ry="16"
              transform="rotate(22 249 121)"
            />
          </g>
          <g fill="#7a4a2d">
            <circle cx="197" cy="112" r="8" />
            <circle cx="215" cy="119" r="7" />
            <circle cx="205" cy="104" r="6" />
          </g>
          <g fill="#3d7546">
            <path d="M114 151l17-10 12 8-11 6Z" />
            <path d="M220 151l16-17 14 7-12 14Z" />
            <path d="M175 128l11-17 8 15-12 9Z" />
          </g>
          {variant === "special" && (
            <>
              <ellipse cx="274" cy="151" rx="20" ry="16" fill="#f4dec4" />
              <ellipse cx="272" cy="149" rx="9" ry="9" fill="#eaa73d" />
            </>
          )}
          <path
            d="M148 74q-16-22 4-42M201 65q-16-23 4-43M254 73q-16-21 4-40"
            stroke="#b7b7a0"
            strokeWidth="4"
            opacity=".5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M284 98L369 33"
            stroke="#6d4e31"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M294 110L381 45"
            stroke="#6d4e31"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
