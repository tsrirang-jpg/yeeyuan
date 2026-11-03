package com.yeeyuan;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
@Component
public class RequestGuard extends OncePerRequestFilter {
 final Auth auth;final Db db;final Set<String> origins;final Map<String,Bucket> buckets=new ConcurrentHashMap<>();
 record Bucket(long minute,int count){}
 public RequestGuard(Auth auth,Settings s,Db db){this.auth=auth;this.db=db;origins=new HashSet<>(Arrays.asList(s.allowedOrigins().split(",")));}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("Cache-Control","no-store");
  String origin=req.getHeader("Origin");if(origin!=null){if(!origins.contains(origin)){res.sendError(403);return;}res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Access-Control-Allow-Credentials","true");res.setHeader("Vary","Origin");}
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type,X-CSRF-Token,Idempotency-Key");if(req.getMethod().equals("OPTIONS")){res.setStatus(204);return;}
  String path=req.getRequestURI();int max=path.contains("/auth/staff")?5:path.contains("/webhooks/")?300:180;long minute=System.currentTimeMillis()/60000;String key=req.getRemoteAddr()+":"+(path.contains("/auth/staff")?"staff":path.contains("/webhooks/")?"hooks":"api");Bucket b=buckets.compute(key,(k,v)->v==null||v.minute!=minute?new Bucket(minute,1):new Bucket(minute,v.count+1));if(buckets.size()>10000)buckets.entrySet().removeIf(e->e.getValue().minute<minute-2);if(b.count>max){res.setStatus(429);res.setHeader("Retry-After","60");return;}
  if(req.getContentLengthLong()>262144){res.sendError(413);return;}
  try{if(Set.of("POST","PUT","PATCH","DELETE").contains(req.getMethod())&&!path.contains("/webhooks/")){if(origin==null&&!req.getHeaderNames().asIterator().hasNext()){res.sendError(403);return;}auth.csrfCheck(req);}chain.doFilter(req,res);}catch(Problem e){res.setStatus(e.status);res.setContentType("application/problem+json");res.getWriter().write(db.encode(Map.of("status",e.status,"code",e.code,"detail",e.getMessage())));}
 }
}
