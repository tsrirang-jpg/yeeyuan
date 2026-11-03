# Yee Yuan ยี่หยวน

ระบบสั่งก๋วยจั๊บญวนและเครื่องดื่ม ใช้ Next.js 16.4 TypeScript, Spring Boot 4.1 และ PostgreSQL 17 รองรับรับกลับบ้านและทานที่โต๊ะ พร้อมคิวแยกอาหารและเครื่องดื่ม

## เริ่มใช้งานใน VS Code

เปิดโฟลเดอร์ `C:\Project\YeeYuan\yeeyuan` ใน VS Code ใช้ Node.js 20.9 ขึ้นไปและ Docker Desktop ถ้ารัน backend ด้วยเครื่องโดยตรงใช้ Java 17 ขึ้นไป แนะนำ Java 21

### หน้าร้านแบบตัวอย่าง

ตั้ง `.env.local` ให้ `NEXT_PUBLIC_DEMO_MODE=true` แล้วรัน `npm run dev` หน้าเว็บจะใช้ข้อมูลตัวอย่างในเบราว์เซอร์โดยไม่เรียก backend ไม่มี QR รับเงินจริงและมีปุ่มจำลองการจ่าย คิวครัวโหมดนี้เห็นเฉพาะข้อมูลในเบราว์เซอร์เดียวกัน

### ใช้ฐานข้อมูลและ backend จริงบนเครื่อง

1. เปิด Docker Desktop
2. คัดลอก `.env.backend.example` เป็น `.env.backend` และ `.env.example` เป็น `.env.local` หากยังไม่มีไฟล์เหล่านี้
3. รัน `docker compose up --build -d` เพื่อเปิด PostgreSQL และ Spring Boot
4. ตั้ง `.env.local` เป็น `NEXT_PUBLIC_DEMO_MODE=false` และ `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1`
5. รัน `npm run dev` เปิด `http://127.0.0.1:3010` หน้าหลังร้านอยู่ `/staff/`
6. บัญชี local คือ `owner` รหัสผ่านอ่านจาก `BOOTSTRAP_ADMIN_PASSWORD` ใน `.env.backend` ตัวอย่าง local ปิด MFA เฉพาะเมื่อ `APP_ENV=local` เท่านั้น

ฐานข้อมูลเปิดบน loopback พอร์ต 15432 เพื่อไม่ชนพอร์ต PostgreSQL ปกติ ข้อมูลคงอยู่ใน volume `yeeyuan-data` หลีกเลี่ยงคำสั่งลบ volume หากต้องการเก็บออเดอร์

หากรัน Java เองแทน container ใช้ `scripts/start-api.ps1` หลัง `docker compose up -d postgres` สคริปต์โหลด `.env.backend` โดยไม่แสดงค่าในหน้าจอ ต้องมี Maven ใน PATH หรือกำหนด `MAVEN_CMD` ไปยัง `mvn.cmd`

## สิ่งที่ทำงานแล้ว

- เมนูและตัวเลือก ขนาด เพิ่มไข่/หมูยอ ความหวาน น้ำแข็ง หมายเหตุ และจำนวน
- ตะกร้า ค่าบรรจุภัณฑ์ quote 2 นาที คิดยอดจากฐานข้อมูล
- สั่งกลับบ้านพร้อมชื่อรับอาหาร หรือเข้าร่วมโต๊ะด้วย QR token และ PIN
- Guest session และ LINE ID token verification ฝั่ง server
- สร้างออเดอร์แบบ idempotent จองจำนวนขายได้ และเก็บ snapshot ราคา
- สร้าง payment attempt แบบ asynchronous, Omise Dynamic PromptPay adapter, signed webhook inbox และงานตรวจยอดซ้ำ
- โหมด MOCK สำหรับเครื่องพัฒนาเท่านั้น การจ่ายซ้ำไม่สร้าง ticket ซ้ำ
- คิวแยกสถานี ครัวกดเริ่ม/พร้อม และตรวจรหัสรับก่อนส่งมอบ
- API หลังร้านสำหรับโต๊ะ ปิดรับออเดอร์ ราคา/จำนวนขายได้ รายงานประจำวัน และ manual refund พร้อมอนุมัติและหลักฐาน
- LINE follow/unfollow และ outbox ส่งข้อความรับชำระ/พร้อมรับ
- CSRF, cookie HttpOnly, owner authorization, RBAC, basic rate limit, webhook signature, encrypted pickup code และ TOTP สำหรับบัญชี production

## ไฟล์สำคัญ

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `app/` | หน้าเว็บและ CSS แบบ responsive |
| `components/` | หน้าร้าน ติดตามออเดอร์ คิวครัว และส่วนจัดการร้าน |
| `lib/api.ts` | ตัวเชื่อม API และ session |
| `lib/demo.ts` | ระบบตัวอย่างในเบราว์เซอร์ แยกจากการรับเงินจริง |
| `backend/src/main/java/com/yeeyuan/` | API, auth, ordering, payments, workers และหลังร้าน |
| `backend/src/main/resources/db/migration/` | Flyway schema 29 ตารางและเมนูเริ่มต้น |
| `contracts/` | เอกสารออกแบบเดิมและสัญญาเป้าหมายสำหรับขยายระบบ |
| `scripts/` | คำสั่งรันและ smoke test สำหรับนักพัฒนา |

## คำสั่งตรวจงาน

```sh
npm run lint
npx tsc --noEmit
npm run build
cd backend
mvn test
```

Next.js สร้าง static export ใน `out/` และใช้ route คงที่ `/orders/?id=...` Spring Boot จัดการข้อมูลและความปลอดภัยทั้งหมด PostgreSQL ใช้ Flyway อัตโนมัติเมื่อเริ่ม API

## ก่อนเปิดรับเงินจริง

โค้ดรุ่นนี้เป็น MVP สำหรับพัฒนาและทดลอง เส้นทางรับเงินจริงต้องผ่าน sandbox ของบัญชีร้านก่อนเปิด live การตั้งค่าในตัวอย่างเป็น local เท่านั้น

- ปิด `NEXT_PUBLIC_DEMO_MODE` และ `MOCK_PAYMENTS`; ตั้ง `APP_ENV=production`, `SECURE_COOKIES=true` และใช้ HTTPS บน frontend/API ที่อยู่ site เดียวกัน
- ตั้ง Omise secret key, webhook signing secret และ API version จากบัญชีร้าน เปิด PromptPay และทดสอบ expired/unknown/late/duplicate events ด้วยบัญชีจริงก่อนปล่อยให้ลูกค้า
- เปลี่ยน DATA_ENCRYPTION_KEY เป็น Base64 32 bytes ที่สุ่มใหม่และเก็บแยกจากฐานข้อมูล อย่าทำหายเพราะต้องใช้ถอดข้อมูลที่บันทึกแล้ว
- ตั้ง LINE Login channel, Messaging API และ LIFF ภายใต้ provider ร้านเดียวกัน ใส่ `openid profile` และกำหนด webhook เป็น `/api/v1/webhooks/line`
- ตั้ง MFA/รหัสผ่านพนักงานจริง ข้อมูลตัวอย่างไม่เหมาะกับ production บัญชี bootstrap สร้างครั้งแรกและไม่เขียนทับรหัสผ่านเดิมเมื่อ restart
- ตั้ง backup/restore, monitoring และผู้ดูแลเงินค้าง ตรวจ reconciliation กับรายงาน Gateway และ statement ธนาคาร
- PromptPay ในการออกแบบนี้ใช้การโอนคืนโดยพนักงานผ่านธนาคาร แล้วลงหลักฐานใน refund case ไม่มีการเรียก API คืนเงินที่ช่องทางไม่รองรับ

ภาพอาหารเป็นภาพประกอบ SVG ในโค้ด เปลี่ยนเป็นรูปจริงของร้านได้ภายหลัง QR ของ Gateway proxy เป็น PNG หรือ SVG ตามชนิดที่ผู้ให้บริการส่งมา โดยตรวจ host/type/size และบังคับ CSP sandbox ไม่ใช่ SVG จากผู้ใช้

## ขอบเขตที่ยังต้องขยายก่อนใช้งานเต็มร้าน

UI หลังร้านรองรับคิว ส่งมอบ โต๊ะและ QR ปิดรับออเดอร์ ราคา จำนวนขายได้ ยอดรับวันนี้ และขั้นตอนคืนเงินแบบเต็มจำนวน ส่วน API รองรับการระบุยอดคืนสำหรับการขยาย UI เพิ่ม รายการแสดงผลเริ่มต้นจำกัด 100 รายการต่อคำขอ จึงยังไม่ใช่ pagination ครบตามสัญญาเป้าหมาย 46 operations

การกระทบยอดอัตโนมัติรุ่นนี้ตรวจรายการ pending/unknown ทุก 60 วินาที ยังต้องเพิ่มการนำเข้ารายงาน settlement และสแกนย้อนหลังรายคืน รวมทั้งหน้าปิด payment incident ตามแบบออกแบบก่อนเปิดร้านจริง rate limit เริ่มต้นอยู่ใน memory ต่อ API instance ต้องตั้ง edge/shared limiter เมื่อขยายหลาย instance ไม่มีการอ้างว่า Omise/LINE live ผ่านแล้วหากยังไม่มี credentials ร้าน

## บริการทดลองที่เปิดไว้บนเครื่อง

ตอนส่งมอบเปิดเว็บโหมดพัฒนาและ API ไว้แล้ว พร้อมฐานข้อมูล MOCK และข้อมูลทดสอบ ไม่มีการรับเงินจริง หากต้องการเปิดคำสั่งรันชุดใหม่ ใช้ scripts/stop-local.ps1 เพื่อหยุดเฉพาะโปรเซสที่บันทึกไว้ของโปรเจกต์นี้ก่อน คำสั่งนี้ไม่หยุด PostgreSQL ใน Docker และไม่ลบข้อมูล

