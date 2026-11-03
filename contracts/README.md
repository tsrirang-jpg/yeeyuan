# เอกสารออกแบบและสัญญาเป้าหมาย

`system-design.html` เป็นเอกสารออกแบบฉบับเต็ม พร้อมภาพและสารบัญ `openapi.json` เป็น API Contract เป้าหมายของเอกสารเดิม ไม่ใช่การรับรองว่า endpoint ทุกข้อและทุก response shape ใช้งานตรงกันแล้วใน MVP นี้

แอปที่รันจริงใช้ DTO ใน `lib/types.ts` และ routing ใน `backend/src/main/java/com/yeeyuan/Api.java` โดยบางคำสั่งหลังร้านคืน `{accepted:true}` และหน้ารายการเริ่มต้นคืนสูงสุด 100 รายการ ส่วนการปิด incident, settlement import, การตั้งค่าเก็บข้อมูลตามนโยบาย และงานย้อนหลังรายคืนต้องพัฒนาต่อก่อนใช้ครบตามเอกสารออกแบบ

ไฟล์ SQL ที่ใช้จริงอยู่ใน Flyway migrations ของ backend มีคอลัมน์เพิ่มสำหรับสถานะเพื่อน LINE และจำนวนเงินจริงที่ Gateway ยืนยัน นอกเหนือจาก reference schema เดิม
