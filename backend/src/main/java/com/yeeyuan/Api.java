package com.yeeyuan;
import java.util.*;
import java.time.*;
import java.nio.charset.StandardCharsets;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import static com.yeeyuan.Db.*;
@RestController @RequestMapping("/api/v1")
public class Api {
 final Auth auth;final Db db;final Orders orders;final MenuService menu;final Payments payments;final Settings settings;final Admin admin;
 public Api(Auth auth,Db db,Orders orders,MenuService menu,Payments payments,Settings settings,Admin admin){this.auth=auth;this.db=db;this.orders=orders;this.menu=menu;this.payments=payments;this.settings=settings;this.admin=admin;}
 record StaffLogin(@NotBlank String username,@NotBlank String password,String totp){}
 record LineLogin(@NotBlank @Size(max=8192) String idToken){}
 record Transition(@NotBlank String targetStatus,@Min(0) long version){}
 record Complete(@Min(0) long version,String pickupCode){}
 record Join(@NotBlank String qrToken,@Pattern(regexp="[0-9]{6}") String pin){}
 @GetMapping("/auth/csrf") Object csrf(HttpServletRequest r,HttpServletResponse s){return auth.csrf(r,s);}
 @PostMapping("/auth/guest") @ResponseStatus(HttpStatus.CREATED) Object guest(HttpServletRequest r,HttpServletResponse s){return auth.guest(r,s);}
 @PostMapping("/auth/staff") Object staff(@Valid @RequestBody StaffLogin b,HttpServletRequest r,HttpServletResponse s){return auth.staffLogin(b.username,b.password,b.totp,r,s);}
 @PostMapping("/auth/line") Object line(@Valid @RequestBody LineLogin b,HttpServletRequest r,HttpServletResponse s){return auth.lineLogin(b.idToken,r,s);}
 @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT) void logout(HttpServletRequest r,HttpServletResponse s){auth.logout(r,s);}
 @GetMapping("/me") Object me(HttpServletRequest r){var u=auth.user(r);return Map.of("id",u.id(),"kind",u.kind(),"roles",u.roles());}
 @GetMapping("/store") Object store(){return menu.store(settings);}
 @GetMapping("/menu") Object menu(){return menu.menu();}
 @PostMapping("/quotes") @ResponseStatus(HttpStatus.CREATED) Object quote(@Valid @RequestBody Orders.QuoteInput b,HttpServletRequest r){return orders.quote(auth.user(r),b);}
 @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) Object create(@Valid @RequestBody Orders.Create b,@RequestHeader("Idempotency-Key") UUID key,HttpServletRequest r){return orders.create(auth.user(r),b,key);}
 @GetMapping("/orders") Object list(HttpServletRequest r){return orders.list(auth.user(r),false);}
 @GetMapping("/orders/{id}") Object order(@PathVariable UUID id,HttpServletRequest r){return orders.view(id,auth.user(r),false);}
 @PostMapping("/orders/{id}/payment-attempts") @ResponseStatus(HttpStatus.CREATED) Object pay(@PathVariable UUID id,@RequestHeader("Idempotency-Key") UUID key,HttpServletRequest r){return payments.create(auth.user(r),id,key);}
 @GetMapping("/payment-attempts/{id}") Object attempt(@PathVariable UUID id,HttpServletRequest r){return payments.view(id,auth.user(r));}
 @GetMapping("/payment-attempts/{id}/qr") ResponseEntity<byte[]> qr(@PathVariable UUID id,HttpServletRequest r){return payments.qr(auth.user(r),id);}
 @PostMapping("/orders/{id}/simulate-payment") Object simulate(@PathVariable UUID id,HttpServletRequest r){payments.simulate(auth.user(r),id);return Map.of("accepted",true);}
 @GetMapping("/orders/{id}/receipt") Object receipt(@PathVariable UUID id,HttpServletRequest r){var o=orders.view(id,auth.user(r),false);if(!"PAID".equals(o.get("paymentStatus")))throw new Problem(409,"UNPAID","ยังไม่ยืนยันรับชำระ");return o;}
 @GetMapping("/staff/orders") Object staffOrders(HttpServletRequest r){return orders.list(auth.cashier(r),true);}
 @GetMapping("/staff/orders/{id}") Object staffOrder(@PathVariable UUID id,HttpServletRequest r){return orders.view(id,auth.cashier(r),true);}
 @GetMapping("/staff/kitchen-tickets") Object tickets(HttpServletRequest r){auth.kitchen(r);return orders.tickets();}
 @PostMapping("/staff/kitchen-tickets/{id}/transition") Object transition(@PathVariable UUID id,@Valid @RequestBody Transition b,HttpServletRequest r){orders.transition(auth.kitchen(r),id,b.targetStatus,b.version);return Map.of("accepted",true);}
 @PostMapping("/staff/orders/{id}/complete") Object complete(@PathVariable UUID id,@Valid @RequestBody Complete b,HttpServletRequest r){return orders.complete(auth.cashier(r),id,b.version,b.pickupCode);}
 @PostMapping("/table-visits/join") Object join(@Valid @RequestBody Join b,HttpServletRequest r){return admin.join(auth.user(r),b.qrToken,b.pin);}
 @GetMapping("/staff/tables") Object tables(HttpServletRequest r){auth.cashier(r);return admin.tables();}
 @PostMapping("/staff/tables/{id}/rotate-qr") Object rotate(@PathVariable UUID id,HttpServletRequest r){return admin.rotate(auth.manager(r),id);}
 @PostMapping("/staff/table-visits") Object open(@RequestBody Map<String,String> b,HttpServletRequest r){return admin.open(auth.cashier(r),UUID.fromString(b.get("tableId")));}
 @PostMapping("/staff/table-visits/{id}/close") Object close(@PathVariable UUID id,HttpServletRequest r){admin.close(auth.cashier(r),id);return Map.of("accepted",true);}
 @PutMapping("/staff/store/availability") Object availability(@RequestBody Map<String,Object> b,HttpServletRequest r){admin.availability(auth.manager(r),Boolean.TRUE.equals(b.get("acceptingOrders")));return menu.store(settings);}
 @GetMapping("/staff/products/{id}/stock") Object stock(@PathVariable UUID id,HttpServletRequest r){auth.manager(r);return admin.stock(id);}
 @PutMapping("/staff/products/{id}/stock") Object stockPut(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){return admin.stock(auth.manager(r),id,b);}
 @PutMapping("/staff/products/{id}") Object product(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){admin.product(auth.manager(r),id,b);return Map.of("accepted",true);}
 @GetMapping("/staff/payment-incidents") Object incidents(HttpServletRequest r){auth.cashier(r);return Map.of("items",db.jdbc.queryForList("SELECT id,order_id,attempt_id,kind,status,details,version FROM payment_incident ORDER BY created_at DESC LIMIT 100"));}
 @PostMapping("/staff/payment-attempts/{id}/recheck") Object recheck(@PathVariable UUID id,HttpServletRequest r){auth.cashier(r);db.jdbc.update("UPDATE payment_attempt SET next_check_at=now() WHERE id=?",id);return Map.of("accepted",true);}
 @GetMapping("/staff/reports/daily") Object report(@RequestParam String date,HttpServletRequest r){auth.manager(r);return admin.report(LocalDate.parse(date));}
 @GetMapping("/staff/refunds") Object refunds(HttpServletRequest r){auth.cashier(r);return Map.of("items",db.jdbc.queryForList("SELECT id,attempt_id,amount_satang,status,reason,version,created_at FROM refund_case ORDER BY created_at DESC LIMIT 100"));}
 @PostMapping("/staff/refunds") Object refund(@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") UUID key,HttpServletRequest r){return admin.refund(auth.cashier(r),b,key);}
 @PostMapping("/staff/refunds/{id}/approve") Object approve(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){return admin.approve(auth.manager(r),id,((Number)b.get("version")).longValue());}
 @PostMapping("/staff/refunds/{id}/confirm-paid") Object refundPaid(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){return admin.refundPaid(auth.manager(r),id,b);}
 @PostMapping("/orders/{id}/cancellation-requests") Object cancelRequest(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){return admin.cancel(auth.user(r),id,false,String.valueOf(b.get("reason")));}
 @PostMapping("/staff/orders/{id}/cancel") Object cancel(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r){return admin.cancel(auth.manager(r),id,true,String.valueOf(b.get("reason")));}
 @PostMapping("/webhooks/omise") Object omise(@RequestHeader(value="Omise-Signature",defaultValue="") String sig,@RequestHeader(value="Omise-Signature-Timestamp",defaultValue="") String timestamp,@RequestBody byte[] raw){if(raw.length>262144)throw Problem.bad("Payload too large");if(!Crypto.omiseSignature(settings.omiseWebhookSecret(),timestamp,sig,raw,Instant.now()))throw new Problem(401,"INVALID_SIGNATURE","Invalid webhook signature");var event=db.decode(new String(raw,StandardCharsets.UTF_8));payments.inbox("OMISE",str(event,"id"),str(event,"key"),event,Crypto.hash(new String(raw,StandardCharsets.UTF_8)));return Map.of("received",true);}
 @PostMapping("/webhooks/line") Object lineWebhook(@RequestHeader(value="x-line-signature",defaultValue="") String sig,@RequestBody byte[] raw){if(raw.length>262144||!Crypto.lineSignature(settings.lineChannelSecret(),sig,raw))throw new Problem(401,"INVALID_SIGNATURE","Invalid webhook signature");var body=db.decode(new String(raw,StandardCharsets.UTF_8));for(var event:Orders.maps(body.get("events")))payments.inbox("LINE",str(event,"webhookEventId"),str(event,"type"),event,Crypto.hash(new String(raw,StandardCharsets.UTF_8)));return Map.of("received",true);}
 @GetMapping("/health/live") Object live(){return Map.of("status","UP");}
 @GetMapping("/health/ready") Object ready(){db.jdbc.queryForObject("SELECT 1",Integer.class);return Map.of("status","UP");}
}
