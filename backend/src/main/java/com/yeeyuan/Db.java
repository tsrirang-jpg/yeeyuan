package com.yeeyuan;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
@Component
public class Db {
 public final JdbcTemplate jdbc; public final ObjectMapper json=new ObjectMapper();
 public Db(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public Map<String,Object> one(String sql,Object... args){var rows=jdbc.queryForList(sql,args);if(rows.isEmpty())throw new Problem(404,"NOT_FOUND","ไม่พบรายการหรือไม่มีสิทธิ์เข้าถึง");return rows.get(0);}
 public String encode(Object x){return json.writeValueAsString(x);}
 @SuppressWarnings("unchecked") public Map<String,Object> decode(Object x){return json.readValue(String.valueOf(x),Map.class);}
 public static String str(Map<String,Object> m,String k){return Objects.toString(m.get(k),"");}
 public static long num(Map<String,Object> m,String k){return ((Number)m.get(k)).longValue();}
 public static UUID uuid(Map<String,Object> m,String k){return UUID.fromString(str(m,k));}
 public static Instant time(Map<String,Object> m,String k){Object v=m.get(k);return v instanceof Timestamp t?t.toInstant():v instanceof java.time.OffsetDateTime t?t.toInstant():Instant.parse(String.valueOf(v));}
 public void audit(UUID actor,String action,UUID resource){jdbc.update("INSERT INTO audit_log(actor_id,action,resource_type,resource_id,trace_id) VALUES(?,?,'orders',?,?)",actor,action,resource,UUID.randomUUID().toString());}
 public void event(UUID order,String from,String to,UUID actor,String reason){jdbc.update("INSERT INTO order_status_event(order_id,from_status,to_status,actor_id,reason) VALUES(?,?,?,?,?)",order,from,to,actor,reason);}
}
