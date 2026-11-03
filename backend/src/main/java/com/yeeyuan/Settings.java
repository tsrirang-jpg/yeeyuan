package com.yeeyuan;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties("shop")
public record Settings(String environment, boolean mockPayments, boolean secureCookies, String allowedOrigins,
 String publicAppUrl,String apiBaseUrl,String encryptionKey,String adminPassword,String adminTotpSecret,
 String omiseSecretKey,String omiseWebhookSecret,String omiseApiVersion,String lineLoginChannelId,
 String lineChannelSecret,String lineChannelAccessToken) {
 public boolean local(){return "local".equals(environment);}
 public Settings {
  if(!"local".equals(environment)){
   if("R4SM1o8zASDqTv4LQ9b6hRqy7vKJXBuXS+Wc3YaZx1M=".equals(encryptionKey))throw new IllegalArgumentException("Replace the local example encryption key before production");
   if(mockPayments||!secureCookies)throw new IllegalArgumentException("Production requires secure cookies and real payments");
   if(encryptionKey==null||encryptionKey.isBlank()||omiseSecretKey==null||!omiseSecretKey.startsWith("skey_live_")||omiseWebhookSecret==null||omiseWebhookSecret.isBlank())throw new IllegalArgumentException("Production encryption key and live payment credentials are required");
   if(publicAppUrl==null||!publicAppUrl.startsWith("https://")||apiBaseUrl==null||!apiBaseUrl.startsWith("https://"))throw new IllegalArgumentException("Production URLs must use HTTPS");
   if(adminPassword!=null&&!adminPassword.isBlank()&&(adminTotpSecret==null||adminTotpSecret.isBlank()))throw new IllegalArgumentException("Production bootstrap staff requires TOTP");
  }
 }
}
