package com.yeeyuan;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
public class Problem extends RuntimeException {
 public final int status;public final String code;
 public Problem(int status,String code,String detail){super(detail);this.status=status;this.code=code;}
 public static Problem bad(String text){return new Problem(422,"INVALID_REQUEST",text);}
}
@RestControllerAdvice
class Errors {
 @ExceptionHandler(Problem.class) ResponseEntity<?> known(Problem e){return response(e.status,e.code,e.getMessage());}
 @ExceptionHandler({MethodArgumentNotValidException.class,org.springframework.web.bind.MissingRequestHeaderException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<?> invalid(Exception e){return response(422,"INVALID_REQUEST","ข้อมูลไม่ถูกต้อง กรุณาตรวจรายการอีกครั้ง");}
 @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class) ResponseEntity<?> conflict(Exception e){return response(409,"CONFLICT","รายการนี้เปลี่ยนแล้วหรือถูกดำเนินการไปแล้ว กรุณาโหลดใหม่");}
 @ExceptionHandler(Exception.class) ResponseEntity<?> unknown(Exception e){System.err.println("Request failed: "+e.getClass().getSimpleName());return response(500,"INTERNAL_ERROR","ระบบขัดข้อง กรุณาลองใหม่ หากเป็นการจ่ายเงินอย่าจ่ายซ้ำ");}
 static ResponseEntity<?> response(int status,String code,String detail){return ResponseEntity.status(status).header("Content-Type","application/problem+json").body(Map.of("type","about:blank","title",code,"status",status,"code",code,"detail",detail,"traceId",UUID.randomUUID().toString()));}
}
