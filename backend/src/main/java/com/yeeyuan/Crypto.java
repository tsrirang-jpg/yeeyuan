package com.yeeyuan;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.stereotype.Component;
@Component
public class Crypto {
 private final SecretKey key;private static final SecureRandom RANDOM=new SecureRandom();
 public Crypto(Settings config){String secret=config.encryptionKey();if(secret==null||secret.isBlank())throw new IllegalArgumentException("DATA_ENCRYPTION_KEY must be set to a Base64 32 byte key");byte[] raw=Base64.getDecoder().decode(secret);if(raw.length!=32)throw new IllegalArgumentException("Encryption key must have 32 bytes");key=new SecretKeySpec(raw,"AES");}
 public static String token(){byte[] b=new byte[32];RANDOM.nextBytes(b);return Base64.getUrlEncoder().withoutPadding().encodeToString(b);}
 public static String pin(){return String.format("%06d",RANDOM.nextInt(1_000_000));}
 public static String hash(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(GeneralSecurityException e){throw new IllegalStateException(e);}}
 public static boolean equal(String a,String b){return a!=null&&b!=null&&MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8),b.getBytes(StandardCharsets.UTF_8));}
 public String encrypt(String plain){try{byte[] iv=new byte[12];RANDOM.nextBytes(iv);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,iv));byte[] encrypted=cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));byte[] out=new byte[iv.length+encrypted.length];System.arraycopy(iv,0,out,0,12);System.arraycopy(encrypted,0,out,12,encrypted.length);return Base64.getEncoder().encodeToString(out);}catch(GeneralSecurityException e){throw new IllegalStateException(e);}}
 public String decrypt(String encrypted){try{byte[] all=Base64.getDecoder().decode(encrypted);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Arrays.copyOf(all,12)));return new String(c.doFinal(Arrays.copyOfRange(all,12,all.length)),StandardCharsets.UTF_8);}catch(GeneralSecurityException e){throw new IllegalStateException(e);}}
 static byte[] hmac(byte[] key,byte[] bytes,String alg){try{Mac mac=Mac.getInstance(alg);mac.init(new SecretKeySpec(key,alg));return mac.doFinal(bytes);}catch(GeneralSecurityException e){throw new IllegalStateException(e);}}
 public static boolean omiseSignature(String encodedSecret,String timestamp,String signatures,byte[] raw,Instant now){try{long seconds=Long.parseLong(timestamp);if(Math.abs(now.getEpochSecond()-seconds)>300)return false;byte[] prefix=(timestamp+".").getBytes(StandardCharsets.UTF_8);byte[] input=new byte[prefix.length+raw.length];System.arraycopy(prefix,0,input,0,prefix.length);System.arraycopy(raw,0,input,prefix.length,raw.length);String expected=HexFormat.of().formatHex(hmac(Base64.getDecoder().decode(encodedSecret),input,"HmacSHA256"));return Arrays.stream(signatures.split(",")).anyMatch(s->equal(s.trim(),expected));}catch(RuntimeException e){return false;}}
 public static boolean lineSignature(String secret,String signature,byte[] raw){return secret!=null&&!secret.isBlank()&&equal(signature,Base64.getEncoder().encodeToString(hmac(secret.getBytes(StandardCharsets.UTF_8),raw,"HmacSHA256")));}
 public static boolean totp(String base32,String value){if(value==null||!value.matches("[0-9]{6}"))return false;try{String alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";int buffer=0,bits=0;java.io.ByteArrayOutputStream key=new java.io.ByteArrayOutputStream();for(char c:base32.toUpperCase(Locale.ROOT).replace("=","").toCharArray()){int n=alphabet.indexOf(c);if(n<0)return false;buffer=(buffer<<5)|n;bits+=5;if(bits>=8){bits-=8;key.write((buffer>>bits)&255);}}long counter=Instant.now().getEpochSecond()/30;for(long t=counter-1;t<=counter+1;t++){byte[] data=java.nio.ByteBuffer.allocate(8).putLong(t).array();byte[] h=hmac(key.toByteArray(),data,"HmacSHA1");int off=h[h.length-1]&15;int code=((h[off]&127)<<24)|((h[off+1]&255)<<16)|((h[off+2]&255)<<8)|(h[off+3]&255);if(equal(String.format("%06d",code%1000000),value))return true;}return false;}catch(RuntimeException e){return false;}}
}
